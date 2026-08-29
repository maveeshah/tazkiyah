import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Text, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class TransactionSource(str, enum.Enum):
    WHATSAPP = "WHATSAPP"
    WEB = "WEB"
    MOBILE = "MOBILE"

class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    household_id = Column(UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False, index=True)
    envelope_id = Column(UUID(as_uuid=True), ForeignKey("envelopes.id", ondelete="RESTRICT"), nullable=False, index=True)
    total_amount = Column(Numeric(15, 2), nullable=False)
    merchant = Column(String(255), nullable=True)
    source = Column(Enum(TransactionSource), default=TransactionSource.WHATSAPP, nullable=False)
    raw_input = Column(Text, nullable=True)
    transacted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    household = relationship("Household", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    envelope = relationship("Envelope", back_populates="transactions")
    line_items = relationship("LineItem", back_populates="transaction", cascade="all, delete-orphan")

class LineItem(Base, TimestampMixin):
    __tablename__ = "line_items"

    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    canonical_item_id = Column(UUID(as_uuid=True), ForeignKey("canonical_items.id", ondelete="SET NULL"), nullable=True, index=True)
    raw_item_name = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), default=1.000, nullable=False)
    unit = Column(String(30), default="piece", nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=True)
    total_price = Column(Numeric(15, 2), nullable=False)
    notes = Column(Text, nullable=True)

    transaction = relationship("Transaction", back_populates="line_items")
    canonical_item = relationship("CanonicalItem", back_populates="line_items")
