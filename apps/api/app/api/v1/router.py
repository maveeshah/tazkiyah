from fastapi import APIRouter
from app.api.v1 import health, households, users, accounts, envelopes, transactions, cpi, goals, webhook

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(households.router)
api_router.include_router(users.router)
api_router.include_router(accounts.router)
api_router.include_router(envelopes.router)
api_router.include_router(transactions.router)
api_router.include_router(cpi.router)
api_router.include_router(goals.router)
api_router.include_router(webhook.router)
