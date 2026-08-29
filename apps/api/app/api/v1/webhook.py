from fastapi import APIRouter, Depends, Query, Response, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.database import get_db
from app.schemas.whatsapp import WhatsAppWebhookPayload, WebhookSimulateRequest
from app.services.whatsapp_intake_service import WhatsAppIntakeService

router = APIRouter(prefix="/webhook", tags=["WhatsApp Webhook"])

@router.get("/whatsapp")
async def verify_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
):
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Invalid verification token")

@router.post("/whatsapp")
async def handle_whatsapp_webhook(
    payload: WhatsAppWebhookPayload,
    db: AsyncSession = Depends(get_db),
):
    for entry in payload.entry:
        for change in entry.changes:
            messages = change.value.messages or []
            for msg in messages:
                from_phone = msg.from_

                if msg.type == "text" and msg.text:
                    await WhatsAppIntakeService.process_incoming_text(
                        from_phone=from_phone,
                        text_body=msg.text.body,
                        db=db,
                    )
                elif msg.type == "interactive" and msg.interactive and msg.interactive.button_reply:
                    await WhatsAppIntakeService.process_interactive_button(
                        from_phone=from_phone,
                        button_id=msg.interactive.button_reply.id,
                        db=db,
                    )

    return {"status": "received"}

@router.post("/simulate")
async def simulate_incoming_message(
    payload: WebhookSimulateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Local development and test harness to simulate incoming WhatsApp actions."""
    if payload.message_type == "text":
        result = await WhatsAppIntakeService.process_incoming_text(
            from_phone=payload.phone_number,
            text_body=payload.content,
            db=db,
        )
    elif payload.message_type == "interactive":
        result = await WhatsAppIntakeService.process_interactive_button(
            from_phone=payload.phone_number,
            button_id=payload.content,
            db=db,
        )
    else:
        result = {"status": "unsupported_type"}

    return {"simulation_result": result}
