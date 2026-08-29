import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
async def test_bootstrap_household(client: AsyncClient):
    resp = await client.get("/api/v1/households/bootstrap")
    assert resp.status_code == 200
    data = resp.json()
    assert "household" in data
    assert "user" in data
    assert data["household"]["name"] is not None
    assert data["user"]["full_name"] is not None


@pytest.mark.asyncio
async def test_user_registration_and_login_flow(client: AsyncClient):
    unique_phone = f"+92300{uuid4().int % 10000000:07d}"
    
    # 1. Register new user and household
    reg_payload = {
        "full_name": "Test User",
        "phone_number": unique_phone,
        "email": f"test_{uuid4().hex[:6]}@tazkiyah.app",
        "role": "ADMIN",
        "household_name": "Test Family Household",
    }
    reg_resp = await client.post("/api/v1/users/register", json=reg_payload)
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    user_id = reg_data["user"]["id"]
    household_id = reg_data["household"]["id"]
    assert reg_data["user"]["phone_number"] == unique_phone
    assert reg_data["household"]["name"] == "Test Family Household"

    # 2. Login with phone number
    login_resp = await client.post("/api/v1/users/login", json={"phone_number": unique_phone})
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["user"]["id"] == user_id
    assert login_data["household"]["id"] == household_id

    # 3. Add a member to this household
    member_phone = f"+92300{uuid4().int % 10000000:07d}"
    member_payload = {
        "full_name": "Family Member",
        "phone_number": member_phone,
        "role": "MEMBER",
    }
    member_resp = await client.post(f"/api/v1/households/{household_id}/users", json=member_payload)
    assert member_resp.status_code == 200
    member_data = member_resp.json()
    member_id = member_data["id"]

    # 4. List household users
    list_resp = await client.get(f"/api/v1/households/{household_id}/users")
    assert list_resp.status_code == 200
    users_list = list_resp.json()
    assert len(users_list) >= 2

    # 5. Update user role
    update_resp = await client.patch(f"/api/v1/users/{member_id}", json={"role": "ADMIN"})
    assert update_resp.status_code == 200
    assert update_resp.json()["role"] == "ADMIN"

    # 6. Delete user
    del_resp = await client.delete(f"/api/v1/users/{member_id}")
    assert del_resp.status_code == 200
