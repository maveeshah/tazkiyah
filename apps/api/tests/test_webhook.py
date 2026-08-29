import pytest

@pytest.mark.asyncio
async def test_webhook_verification_success(client):
    params = {
        "hub.mode": "subscribe",
        "hub.challenge": "1158201444",
        "hub.verify_token": "tazkiyah_verify_secret",
    }
    resp = await client.get("/api/v1/webhook/whatsapp", params=params)
    assert resp.status_code == 200
    assert resp.text == "1158201444"

@pytest.mark.asyncio
async def test_webhook_verification_invalid_token(client):
    params = {
        "hub.mode": "subscribe",
        "hub.challenge": "1158201444",
        "hub.verify_token": "wrong_token",
    }
    resp = await client.get("/api/v1/webhook/whatsapp", params=params)
    assert resp.status_code == 403
