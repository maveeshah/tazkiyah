from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Household(Base, TimestampMixin):
    __tablename__ = "households"

    name = Column(String(255), nullable=False)
    base_currency = Column(String(3), default="PKR", nullable=False)

    users = relationship("User", back_populates="household", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="household", cascade="all, delete-orphan")
    envelope_groups = relationship("EnvelopeGroup", back_populates="household", cascade="all, delete-orphan")
    canonical_items = relationship("CanonicalItem", back_populates="household", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="household", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="household", cascade="all, delete-orphan")

class User(Base, TimestampMixin):
    __tablename__ = "users"

    household_id = Column(UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone_number = Column(String(30), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="MEMBER", nullable=False)

    household = relationship("Household", back_populates="users")
