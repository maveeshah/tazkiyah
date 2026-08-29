import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class CanonicalItem(Base, TimestampMixin):
    __tablename__ = "canonical_items"

    household_id = Column(UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    category = Column(String(100), default="General", nullable=False)
    standard_unit = Column(String(30), default="piece", nullable=False)

    __table_args__ = (
        UniqueConstraint("household_id", "name", name="uq_household_canonical_item_name"),
    )

    household = relationship("Household", back_populates="canonical_items")
    price_history = relationship("PriceHistory", back_populates="canonical_item", cascade="all, delete-orphan")
    line_items = relationship("LineItem", back_populates="canonical_item")

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    canonical_item_id = Column(UUID(as_uuid=True), ForeignKey("canonical_items.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_price = Column(Numeric(15, 2), nullable=False)
    unit = Column(String(30), nullable=False)
    merchant = Column(String(255), nullable=True)
    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    canonical_item = relationship("CanonicalItem", back_populates="price_history")
