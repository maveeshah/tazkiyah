from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.household import User
from app.models.account import Account
from app.models.envelope import Envelope, EnvelopeGroup
from app.models.transaction import TransactionSource
from app.schemas.transaction import TransactionCreate, LineItemCreate
from app.schemas.whatsapp import AIExtractedTransaction
from app.services.parser_service import ParserService
from app.services.ledger_service import LedgerService
from app.services.whatsapp_client import WhatsAppClient

# In-memory staging for interactive button prompts (phone_number -> staged_data)
STAGED_TRANSACTIONS: Dict[str, Dict[str, Any]] = {}

class WhatsAppIntakeService:
    @classmethod
    def _normalize_phone(cls, phone: str) -> str:
        cleaned = phone.strip().replace(" ", "").replace("-", "")
        if not cleaned.startswith("+"):
            cleaned = "+" + cleaned
        return cleaned

    @classmethod
    async def resolve_user(cls, phone_number: str, db: AsyncSession) -> Optional[User]:
        clean_phone = cls._normalize_phone(phone_number)
        result = await db.execute(
            select(User)
            .options(selectinload(User.household))
            .where(User.phone_number == clean_phone)
        )
        return result.scalar_one_or_none()

    @classmethod
    async def process_incoming_text(
        cls,
        from_phone: str,
        text_body: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        user = await cls.resolve_user(from_phone, db)
        if not user:
            msg = "⚠️ Your phone number is not registered with Tazkiyah. Please register in the dashboard first."
            await WhatsAppClient.send_text(from_phone, msg)
            return {"status": "unregistered_user"}

        household_id = user.household_id

        # 1. Fetch available Accounts and Envelopes for context injection
        accounts_res = await db.execute(
            select(Account).where(Account.household_id == household_id, Account.is_active == True)
        )
        accounts = list(accounts_res.scalars().all())

        envelopes_res = await db.execute(
            select(Envelope)
            .join(EnvelopeGroup, Envelope.group_id == EnvelopeGroup.id)
            .where(EnvelopeGroup.household_id == household_id)
        )
        envelopes = list(envelopes_res.scalars().all())

        account_names = [a.name for a in accounts]
        envelope_names = [e.name for e in envelopes]

        # 2. Parse text with AI Multimodal Parser
        extracted: AIExtractedTransaction = await ParserService.parse_text(
            raw_text=text_body,
            known_accounts=account_names,
            known_envelopes=envelope_names,
        )

        # 3. Match Account
        matched_account: Optional[Account] = None
        if extracted.account_hint:
            hint_lower = extracted.account_hint.lower()
            matched_account = next(
                (
                    a for a in accounts
                    if a.name.lower() == hint_lower
                    or hint_lower in a.name.lower()
                    or a.name.lower() in hint_lower
                ),
                None,
            )

        # 4. If Account is ambiguous or not specified, ask via Meta Quick-Reply Buttons!
        if not matched_account:
            if len(accounts) == 1:
                matched_account = accounts[0]
            else:
                # Stage transaction and send button prompt
                STAGED_TRANSACTIONS[from_phone] = {
                    "extracted": extracted.model_dump(mode="json"),
                    "raw_input": text_body,
                }
                buttons = [(str(acc.id), acc.name) for acc in accounts[:3]]
                prompt_text = f"Which account did you use to pay Rs {extracted.total_amount:.2f}?"
                await WhatsAppClient.send_quick_reply_buttons(
                    to=from_phone,
                    body_text=prompt_text,
                    buttons=buttons,
                )
                return {"status": "prompted_for_account", "buttons": buttons}

        # 5. Match Envelope (default to first envelope if none specified)
        matched_envelope: Optional[Envelope] = None
        if extracted.envelope_hint:
            env_hint_lower = extracted.envelope_hint.lower()
            matched_envelope = next(
                (e for e in envelopes if e.name.lower() == env_hint_lower or env_hint_lower in e.name.lower()),
                None,
            )
        if not matched_envelope and envelopes:
            # Fallback to 'Grocery' or first envelope
            matched_envelope = next(
                (e for e in envelopes if "groc" in e.name.lower() or "daily" in e.name.lower()),
                envelopes[0],
            )

        # 6. Commit Transaction to Ledger
        return await cls._commit_transaction_and_respond(
            user=user,
            account=matched_account,
            envelope=matched_envelope,
            extracted=extracted,
            raw_input=text_body,
            from_phone=from_phone,
            db=db,
        )

    @classmethod
    async def process_interactive_button(
        cls,
        from_phone: str,
        button_id: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        user = await cls.resolve_user(from_phone, db)
        if not user or from_phone not in STAGED_TRANSACTIONS:
            await WhatsAppClient.send_text(from_phone, "⚠️ No pending transaction found.")
            return {"status": "no_staged_transaction"}

        staged = STAGED_TRANSACTIONS.pop(from_phone)
        extracted_dict = staged["extracted"]
        raw_input = staged["raw_input"]
        extracted = ParserService._dict_to_extracted_tx(extracted_dict)

        # Find chosen account
        acc_res = await db.execute(
            select(Account).where(Account.id == button_id, Account.household_id == user.household_id)
        )
        account = acc_res.scalar_one_or_none()
        if not account:
            await WhatsAppClient.send_text(from_phone, "⚠️ Account selection invalid.")
            return {"status": "invalid_account"}

        # Find envelope
        envelopes_res = await db.execute(
            select(Envelope)
            .join(EnvelopeGroup, Envelope.group_id == EnvelopeGroup.id)
            .where(EnvelopeGroup.household_id == user.household_id)
        )
        envelopes = list(envelopes_res.scalars().all())
        matched_envelope = envelopes[0] if envelopes else None

        return await cls._commit_transaction_and_respond(
            user=user,
            account=account,
            envelope=matched_envelope,
            extracted=extracted,
            raw_input=raw_input,
            from_phone=from_phone,
            db=db,
        )

    @classmethod
    async def _commit_transaction_and_respond(
        cls,
        user: User,
        account: Account,
        envelope: Optional[Envelope],
        extracted: AIExtractedTransaction,
        raw_input: str,
        from_phone: str,
        db: AsyncSession,
    ) -> Dict[str, Any]:
        if envelope is None:
            await WhatsAppClient.send_text(
                from_phone,
                "⚠️ Your household has no budget envelopes yet. Add one in the dashboard "
                "before logging expenses here.",
            )
            return {"status": "no_envelope"}

        line_item_creates = [
            LineItemCreate(
                raw_item_name=item.raw_name,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                total_price=item.total_price,
                notes=item.notes,
            )
            for item in extracted.line_items
        ]

        tx_payload = TransactionCreate(
            household_id=user.household_id,
            account_id=account.id,
            envelope_id=envelope.id,
            total_amount=extracted.total_amount,
            merchant=extracted.merchant,
            source=TransactionSource.WHATSAPP,
            raw_input=raw_input,
            line_items=line_item_creates,
        )

        tx = await LedgerService.create_transaction(payload=tx_payload, db=db)

        # Reload envelope balance
        await db.refresh(envelope)
        remaining_balance = envelope.available_balance

        # Format receipt response
        lines = [f"✅ *Logged:* {extracted.merchant or 'Purchase'} ({account.name})"]
        for li in extracted.line_items:
            lines.append(f"• {li.quantity:g} {li.unit} *{li.canonical_name}* @ Rs {li.unit_price:.2f}/{li.unit} → Rs {li.total_price:.2f}")
        lines.append("─────────────────────────────")
        lines.append(f"*Total:* Rs {extracted.total_amount:.2f} ({envelope.name}: Rs {remaining_balance:.2f} left)")

        response_msg = "\n".join(lines)
        await WhatsAppClient.send_text(from_phone, response_msg)

        # Overspending warning if applicable
        if remaining_balance < 0:
            overspend_amt = abs(remaining_balance)
            warning_msg = f"⚠️ *Overspending Alert:* '{envelope.name}' is overspent by Rs {overspend_amt:.2f}. Please rebalance from another envelope on the dashboard."
            await WhatsAppClient.send_text(from_phone, warning_msg)

        return {
            "status": "success",
            "transaction_id": str(tx.id),
            "total_amount": float(extracted.total_amount),
            "envelope_balance": remaining_balance,
        }
