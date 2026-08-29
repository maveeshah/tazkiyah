import httpx
from collections import deque
from typing import List, Tuple, Dict, Any, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class WhatsAppClient:
    # Bounded so a long-running process can't leak memory; tests read the tail.
    sent_messages_log: "deque[Dict[str, Any]]" = deque(maxlen=200)

    @classmethod
    def get_api_url(cls) -> Optional[str]:
        if settings.WHATSAPP_PHONE_NUMBER_ID:
            return f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        return None

    @classmethod
    async def send_text(cls, to: str, text: str) -> Dict[str, Any]:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }
        cls.sent_messages_log.append(payload)

        api_url = cls.get_api_url()
        if not api_url or not settings.WHATSAPP_TOKEN:
            logger.info(f"[MOCK WhatsApp] To: {to} | Text: {text}")
            return {"status": "mock_sent", "payload": payload}

        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(api_url, json=payload, headers=headers)
            return resp.json()

    @classmethod
    async def send_quick_reply_buttons(
        cls,
        to: str,
        body_text: str,
        buttons: List[Tuple[str, str]],  # List of (button_id, button_title) max 3
    ) -> Dict[str, Any]:
        button_elements = [
            {
                "type": "reply",
                "reply": {
                    "id": btn_id,
                    "title": btn_title[:20],  # Meta max 20 chars
                },
            }
            for btn_id, btn_title in buttons[:3]
        ]

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "body": {"text": body_text},
                "action": {"buttons": button_elements},
            },
        }
        cls.sent_messages_log.append(payload)

        api_url = cls.get_api_url()
        if not api_url or not settings.WHATSAPP_TOKEN:
            logger.info(f"[MOCK WhatsApp Buttons] To: {to} | Body: {body_text} | Buttons: {buttons}")
            return {"status": "mock_sent", "payload": payload}

        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(api_url, json=payload, headers=headers)
            return resp.json()

    @classmethod
    async def send_interactive_list(
        cls,
        to: str,
        header: str,
        body_text: str,
        button_label: str,
        sections: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "list",
                "header": {"type": "text", "text": header},
                "body": {"text": body_text},
                "action": {
                    "button": button_label,
                    "sections": sections,
                },
            },
        }
        cls.sent_messages_log.append(payload)

        api_url = cls.get_api_url()
        if not api_url or not settings.WHATSAPP_TOKEN:
            logger.info(f"[MOCK WhatsApp List] To: {to} | Header: {header} | Body: {body_text}")
            return {"status": "mock_sent", "payload": payload}

        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(api_url, json=payload, headers=headers)
            return resp.json()

    @classmethod
    async def download_media(cls, media_id: str) -> Tuple[bytes, str]:
        if not settings.WHATSAPP_TOKEN:
            return b"mock_media_bytes", "audio/ogg"

        headers = {"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Get media URL
            url_resp = await client.get(f"https://graph.facebook.com/v21.0/{media_id}", headers=headers)
            url_data = url_resp.json()
            media_url = url_data.get("url")
            mime_type = url_data.get("mime_type", "application/octet-stream")

            # 2. Download binary stream
            if media_url:
                media_resp = await client.get(media_url, headers=headers)
                return media_resp.content, mime_type

        return b"", "application/octet-stream"
