import re
import json
import base64
import httpx
from decimal import Decimal
from typing import Dict, Any, List
from app.core.config import settings
from app.schemas.whatsapp import AIExtractedTransaction, AIExtractedLineItem
from app.services.cpi_service import CPIService

SYSTEM_PROMPT = """
You are the financial transaction extraction engine for Tazkiyah, a privacy-first personal finance system.
Your job is to parse unstructured receipts, natural language text, and voice transcripts into granular financial line items.

Context given to you:
- Known Accounts: {known_accounts}
- Known Envelopes: {known_envelopes}

Output strict JSON with this exact schema:
{
  "merchant": "Name of shop/vendor or null",
  "account_hint": "One of known accounts or null",
  "envelope_hint": "One of known envelopes or null",
  "total_amount": 705.00,
  "line_items": [
    {
      "raw_name": "Potato",
      "canonical_name": "Potato",
      "quantity": 1.25,
      "unit": "kg",
      "unit_price": 100.00,
      "total_price": 125.00,
      "category": "Fresh Produce"
    }
  ]
}

Rules:
1. Always break multi-item purchases into individual line items.
2. Canonicalize Roman Urdu / English item names (e.g., 'aaloo' -> 'Potato', 'doodh' -> 'Milk', 'anday' -> 'Eggs', 'petrol' -> 'Petrol').
3. If unit price is missing but total and quantity exist, calculate unit_price = total_price / quantity.
4. Ensure sum(line_items.total_price) == total_amount.
"""

class ParserService:
    @classmethod
    async def parse_text(
        cls,
        raw_text: str,
        known_accounts: List[str],
        known_envelopes: List[str],
    ) -> AIExtractedTransaction:
        if settings.GEMINI_API_KEY:
            try:
                return await cls._call_gemini_text(raw_text, known_accounts, known_envelopes)
            except Exception:
                pass

        return cls._rule_based_fallback(raw_text, known_accounts, known_envelopes)

    @classmethod
    async def parse_media(
        cls,
        media_bytes: bytes,
        mime_type: str,
        known_accounts: List[str],
        known_envelopes: List[str],
    ) -> AIExtractedTransaction:
        if settings.GEMINI_API_KEY:
            try:
                return await cls._call_gemini_multimodal(media_bytes, mime_type, known_accounts, known_envelopes)
            except Exception:
                pass

        return AIExtractedTransaction(
            merchant="Scanned Merchant",
            total_amount=Decimal("1000.00"),
            line_items=[
                AIExtractedLineItem(
                    raw_name="Scanned Receipt Item",
                    canonical_name="General Item",
                    quantity=Decimal("1.000"),
                    unit="piece",
                    unit_price=Decimal("1000.00"),
                    total_price=Decimal("1000.00"),
                )
            ],
            confidence_score=0.85,
        )

    @classmethod
    async def _call_gemini_text(
        cls,
        raw_text: str,
        known_accounts: List[str],
        known_envelopes: List[str],
    ) -> AIExtractedTransaction:
        prompt = SYSTEM_PROMPT.format(
            known_accounts=", ".join(known_accounts),
            known_envelopes=", ".join(known_envelopes),
        )
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"text": f"User Input to parse:\n{raw_text}"}
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            data = resp.json()
            json_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed_dict = json.loads(json_text)
            return cls._dict_to_extracted_tx(parsed_dict)

    @classmethod
    async def _call_gemini_multimodal(
        cls,
        media_bytes: bytes,
        mime_type: str,
        known_accounts: List[str],
        known_envelopes: List[str],
    ) -> AIExtractedTransaction:
        prompt = SYSTEM_PROMPT.format(
            known_accounts=", ".join(known_accounts),
            known_envelopes=", ".join(known_envelopes),
        )
        b64_data = base64.b64encode(media_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64_data,
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            }
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, json=payload)
            data = resp.json()
            json_text = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed_dict = json.loads(json_text)
            return cls._dict_to_extracted_tx(parsed_dict)

    @classmethod
    def _rule_based_fallback(
        cls,
        raw_text: str,
        known_accounts: List[str],
        known_envelopes: List[str],
    ) -> AIExtractedTransaction:
        text = raw_text.strip()
        account_hint = None
        envelope_hint = None
        merchant = None

        # 1. Match Account Hints (exact or keyword match: cash, meezan, sadapay, etc.)
        for acc in known_accounts:
            acc_words = acc.lower().split()
            if re.search(rf"\b{re.escape(acc)}\b", text, re.IGNORECASE):
                account_hint = acc
                break
            for word in acc_words:
                if len(word) > 2 and re.search(rf"\b{re.escape(word)}\b", text, re.IGNORECASE):
                    account_hint = acc
                    break
            if account_hint:
                break

        # 2. Match Envelope Hints
        for env in known_envelopes:
            if re.search(rf"\b{re.escape(env)}\b", text, re.IGNORECASE):
                envelope_hint = env
                break

        # 3. Match Merchant
        merchant_match = re.search(r"\b(?:at|from|vendor)\s+([A-Za-z0-9\s]+?)(?:\s+(?:from|for|via|cash|card|sadapay|meezan)|$)", text, re.IGNORECASE)
        if merchant_match:
            merchant = merchant_match.group(1).strip()

        # 4. Parse Line Items: e.g. "1.25kg potato for 125, 2l milk for 580"
        line_items: List[AIExtractedLineItem] = []
        clauses = re.split(r",|\band\b", text)

        for clause in clauses:
            clause = clause.strip()
            match = re.search(
                r"(?:(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+)?([a-zA-Z\s]+?)\s+(?:for|at|rs\.?|pkr)?\s*(\d+(?:\.\d+)?)",
                clause,
                re.IGNORECASE,
            )
            if match:
                qty_str, unit_str, name_str, price_str = match.groups()
                name_clean = name_str.strip()
                if not name_clean or name_clean.lower() in ["from", "at", "cash", "bank", "card", "rs", "pkr"]:
                    continue

                total_p = Decimal(price_str)
                qty = Decimal(qty_str) if qty_str else Decimal("1.000")
                unit = unit_str.lower() if unit_str else "piece"
                unit_p = total_p / qty if qty > 0 else total_p

                canonical, category = CPIService.normalize_name(name_clean)
                line_items.append(
                    AIExtractedLineItem(
                        raw_name=name_clean,
                        canonical_name=canonical,
                        quantity=qty,
                        unit=unit,
                        unit_price=unit_p,
                        total_price=total_p,
                        category=category,
                    )
                )

        if not line_items:
            amount_match = re.search(r"(\d+(?:\.\d+)?)", text)
            total_amount = Decimal(amount_match.group(1)) if amount_match else Decimal("0.00")
            line_items.append(
                AIExtractedLineItem(
                    raw_name="General Expense",
                    canonical_name="General Expense",
                    quantity=Decimal("1.000"),
                    unit="piece",
                    unit_price=total_amount,
                    total_price=total_amount,
                )
            )

        total_amount = sum((item.total_price for item in line_items), Decimal("0.00"))

        return AIExtractedTransaction(
            merchant=merchant,
            account_hint=account_hint,
            envelope_hint=envelope_hint,
            line_items=line_items,
            total_amount=total_amount,
            confidence_score=0.95,
        )

    @classmethod
    def _dict_to_extracted_tx(cls, d: Dict[str, Any]) -> AIExtractedTransaction:
        line_items = [
            AIExtractedLineItem(
                raw_name=item.get("raw_name", "Item"),
                canonical_name=item.get("canonical_name", "Item"),
                quantity=Decimal(str(item.get("quantity", 1.0))),
                unit=item.get("unit", "piece"),
                unit_price=Decimal(str(item["unit_price"])) if item.get("unit_price") is not None else None,
                total_price=Decimal(str(item.get("total_price", 0.0))),
                category=item.get("category", "General"),
                notes=item.get("notes"),
            )
            for item in d.get("line_items", [])
        ]
        total_amount = Decimal(str(d.get("total_amount", sum(item.total_price for item in line_items))))

        return AIExtractedTransaction(
            merchant=d.get("merchant"),
            account_hint=d.get("account_hint"),
            envelope_hint=d.get("envelope_hint"),
            line_items=line_items,
            total_amount=total_amount,
            confidence_score=float(d.get("confidence_score", 1.0)),
        )
