from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime

class AIExtractedLineItem(BaseModel):
    raw_name: str
    canonical_name: str
    quantity: Decimal = Decimal("1.000")
    unit: str = "piece"
    unit_price: Optional[Decimal] = None
    total_price: Decimal
    category: Optional[str] = "General"
    notes: Optional[str] = None

class AIExtractedTransaction(BaseModel):
    merchant: Optional[str] = None
    transacted_at: Optional[datetime] = None
    account_hint: Optional[str] = None
    envelope_hint: Optional[str] = None
    line_items: List[AIExtractedLineItem]
    total_amount: Decimal
    confidence_score: float = 1.0
    summary: Optional[str] = None

class WebhookSimulateRequest(BaseModel):
    phone_number: str
    message_type: str = "text"  # 'text', 'audio', 'image', 'interactive'
    content: str  # text content, base64 data, or interactive button id
    media_url: Optional[str] = None
    media_mime_type: Optional[str] = None

class WhatsAppButtonReply(BaseModel):
    id: str
    title: str

class WhatsAppInteractiveMessage(BaseModel):
    type: str  # 'button_reply', 'list_reply'
    button_reply: Optional[WhatsAppButtonReply] = None

class WhatsAppTextMessage(BaseModel):
    body: str

class WhatsAppMediaMessage(BaseModel):
    id: str
    mime_type: Optional[str] = None
    sha256: Optional[str] = None

class WhatsAppIncomingMessage(BaseModel):
    id: str
    from_: str = Field(..., alias="from")
    timestamp: str
    type: str  # 'text', 'audio', 'image', 'interactive'
    text: Optional[WhatsAppTextMessage] = None
    audio: Optional[WhatsAppMediaMessage] = None
    image: Optional[WhatsAppMediaMessage] = None
    interactive: Optional[WhatsAppInteractiveMessage] = None

class WhatsAppValue(BaseModel):
    messaging_product: str = "whatsapp"
    metadata: Dict[str, Any] = {}
    contacts: Optional[List[Dict[str, Any]]] = None
    messages: Optional[List[WhatsAppIncomingMessage]] = None

class WhatsAppChange(BaseModel):
    value: WhatsAppValue
    field: str

class WhatsAppEntry(BaseModel):
    id: str
    changes: List[WhatsAppChange]

class WhatsAppWebhookPayload(BaseModel):
    object: str
    entry: List[WhatsAppEntry]
