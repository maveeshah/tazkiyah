from sqlalchemy import Column, String, Numeric, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class EnvelopeGroup(Base, TimestampMixin):
    __tablename__ = "envelope_groups"

    household_id = Column(UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    household = relationship("Household", back_populates="envelope_groups")
    envelopes = relationship("Envelope", back_populates="group", cascade="all, delete-orphan")

class Envelope(Base, TimestampMixin):
    __tablename__ = "envelopes"

    group_id = Column(UUID(as_uuid=True), ForeignKey("envelope_groups.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    assigned_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    spent_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    target_amount = Column(Numeric(15, 2), nullable=True)

    group = relationship("EnvelopeGroup", back_populates="envelopes")
    transactions = relationship("Transaction", back_populates="envelope")
    goal = relationship("Goal", back_populates="envelope", uselist=False)

    @property
    def available_balance(self) -> float:
        return float(self.assigned_amount) - float(self.spent_amount)
