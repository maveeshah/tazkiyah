import enum
from sqlalchemy import Column, String, Numeric, Boolean, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class AccountType(str, enum.Enum):
    CASH = "CASH"
    BANK = "BANK"
    EMI = "EMI"
    CREDIT = "CREDIT"

class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    household_id = Column(UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(Enum(AccountType), default=AccountType.BANK, nullable=False)
    current_balance = Column(Numeric(15, 2), default=0.00, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    household = relationship("Household", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

    @property
    def is_overdrawn(self) -> bool:
        return self.current_balance < 0
