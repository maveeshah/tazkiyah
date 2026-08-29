import enum
from sqlalchemy import Column, String, Numeric, Date, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class GoalType(str, enum.Enum):
    TARGET_BY_DATE = "TARGET_BY_DATE"
    TARGET_CAP = "TARGET_CAP"
    SINKING_FUND = "SINKING_FUND"

class Goal(Base, TimestampMixin):
    __tablename__ = "goals"

    household_id = Column(UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    envelope_id = Column(UUID(as_uuid=True), ForeignKey("envelopes.id", ondelete="SET NULL"), unique=True, nullable=True)
    name = Column(String(255), nullable=False)
    goal_type = Column(Enum(GoalType), default=GoalType.TARGET_BY_DATE, nullable=False)
    target_amount = Column(Numeric(15, 2), nullable=False)
    target_date = Column(Date, nullable=True)
    current_balance = Column(Numeric(15, 2), default=0.00, nullable=False)

    household = relationship("Household", back_populates="goals")
    envelope = relationship("Envelope", back_populates="goal")
