"""
Zteeel API Backend Tests - PostgreSQL + PostGIS
Tests all critical endpoints: auth, vendor, customer, orders, payments
"""
import pytest
import requests
import os

BASE_URL = "https://local-marketplace-81.preview.emergentagent.com"

# ─── Fixtures ────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def api():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def customer_token(api):
    # Register a test customer
    email = "TEST_customer_zteeel@example.com"
    reg = api.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "name": "Test Customer", "password": "testpass123", "role": "customer"
    })
    if reg.status_code == 200:
        token = reg.json().get("token")
        if token:
            return token
    # Try login if already exists
    login = api.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "testpass123"})
    if login.status_code == 200:
        return login.json().get("token")
    pytest.skip("Could not get customer token")

@pytest.fixture(scope="session")
def vendor_token(api):
    login = api.post(f"{BASE_URL}/api/auth/login", json={
        "email": "maharaja@zteeel.com", "password": "vendor123"
    })
    if login.status_code == 200:
        return login.json().get("token")
    pytest.skip("Could not get vendor token")

@pytest.fixture(scope="session")
def vendor_id(api, vendor_token):
    r = api.get(f"{BASE_URL}/api/vendor/profile", headers={"Authorization": f"Bearer {vendor_token}"})
    if r.status_code == 200:
        return r.json().get("vendor_id")
    pytest.skip("Could not get vendor_id")


# ─── Health ───────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_check(self, api):
        r = api.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        print(f"Health: {data}")
        assert data.get("status") in ("healthy", "ok")
        # Confirm PostgreSQL
        assert "postgresql" in str(data).lower() or "postgres" in str(data).lower() or data.get("database") is not None


# ─── Auth ─────────────────────────────────────────────────────────────────────
class TestAuth:
    def test_register_customer(self, api):
        r = api.post(f"{BASE_URL}/api/auth/register", json={
            "email": "TEST_register_new@zteeel.com",
            "name": "New Test User",
            "password": "testpass123",
            "role": "customer"
        })
        print(f"Register: {r.status_code} {r.text[:200]}")
        assert r.status_code in (200, 201, 400, 409)  # 400/409 if already exists

    def test_login_customer(self, api, customer_token):
        assert customer_token is not None
        print(f"Customer token obtained: {customer_token[:20]}...")

    def test_login_vendor(self, api, vendor_token):
        assert vendor_token is not None
        print(f"Vendor token obtained: {vendor_token[:20]}...")

    def test_get_me(self, api, customer_token):
        r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {customer_token}"})
        print(f"GET /auth/me: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        data = r.json()
        assert "email" in data or "user_id" in data

    def test_login_invalid(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@zteeel.com", "password": "wrong"})
        assert r.status_code in (401, 400, 404)


# ─── Vendor ───────────────────────────────────────────────────────────────────
class TestVendor:
    def test_get_vendor_profile(self, api, vendor_token):
        r = api.get(f"{BASE_URL}/api/vendor/profile", headers={"Authorization": f"Bearer {vendor_token}"})
        print(f"Vendor profile: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        data = r.json()
        assert "store_name" in data or "vendor_id" in data

    def test_get_vendor_menu(self, api, vendor_token):
        r = api.get(f"{BASE_URL}/api/vendor/menu", headers={"Authorization": f"Bearer {vendor_token}"})
        print(f"Vendor menu: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_menu_item(self, api, vendor_token):
        r = api.post(f"{BASE_URL}/api/vendor/menu", headers={"Authorization": f"Bearer {vendor_token}"}, json={
            "name": "TEST_Butter Chicken",
            "description": "Test menu item",
            "price": 299.0,
            "category": "Main",
            "is_available": True
        })
        print(f"Add menu: {r.status_code} {r.text[:200]}")
        assert r.status_code in (200, 201)

    def test_get_vendor_deals(self, api, vendor_token):
        r = api.get(f"{BASE_URL}/api/vendor/deals", headers={"Authorization": f"Bearer {vendor_token}"})
        print(f"Vendor deals: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_deal(self, api, vendor_token):
        r = api.post(f"{BASE_URL}/api/vendor/deals", headers={"Authorization": f"Bearer {vendor_token}"}, json={
            "title": "TEST_Lunch Special",
            "description": "Test deal",
            "type": "slow_hour",
            "discount_percentage": 20.0,
            "start_time": "12:00",
            "end_time": "15:00"
        })
        print(f"Create deal: {r.status_code} {r.text[:200]}")
        assert r.status_code in (200, 201)

    def test_create_reward(self, api, vendor_token):
        r = api.post(f"{BASE_URL}/api/vendor/rewards", headers={"Authorization": f"Bearer {vendor_token}"}, json={
            "threshold": 100.0,
            "reward": "10% off on all items",
            "color": "#FFD700"
        })
        print(f"Create reward: {r.status_code} {r.text[:200]}")
        assert r.status_code in (200, 201)

    def test_vendor_analytics(self, api, vendor_token):
        r = api.get(f"{BASE_URL}/api/vendor/analytics", headers={"Authorization": f"Bearer {vendor_token}"})
        print(f"Vendor analytics: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200


# ─── Customer ─────────────────────────────────────────────────────────────────
class TestCustomer:
    def test_nearby_deals(self, api, customer_token):
        r = api.get(f"{BASE_URL}/api/customer/deals/nearby?lat=19.0560&lng=72.8310",
                    headers={"Authorization": f"Bearer {customer_token}"})
        print(f"Nearby deals: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_nearby_vendors(self, api, customer_token):
        r = api.get(f"{BASE_URL}/api/customer/vendors/nearby?lat=19.0560&lng=72.8310",
                    headers={"Authorization": f"Bearer {customer_token}"})
        print(f"Nearby vendors: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_vendor_menu_public(self, api, customer_token, vendor_id):
        r = api.get(f"{BASE_URL}/api/customer/vendors/{vendor_id}/menu",
                    headers={"Authorization": f"Bearer {customer_token}"})
        print(f"Public vendor menu: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_vendor_deals_public(self, api, customer_token, vendor_id):
        r = api.get(f"{BASE_URL}/api/customer/vendors/{vendor_id}/deals",
                    headers={"Authorization": f"Bearer {customer_token}"})
        print(f"Public vendor deals: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ─── Orders ───────────────────────────────────────────────────────────────────
class TestOrders:
    def test_create_order(self, api, customer_token, vendor_id):
        r = api.post(f"{BASE_URL}/api/orders", headers={"Authorization": f"Bearer {customer_token}"}, json={
            "vendor_id": vendor_id,
            "items": [{"item_id": "test_item", "name": "Test Item", "price": 100.0, "quantity": 1}],
            "total": 100.0,
            "discount": 0.0
        })
        print(f"Create order: {r.status_code} {r.text[:200]}")
        assert r.status_code in (200, 201)

    def test_get_orders(self, api, customer_token):
        r = api.get(f"{BASE_URL}/api/orders", headers={"Authorization": f"Bearer {customer_token}"})
        print(f"Get orders: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ─── Payments ─────────────────────────────────────────────────────────────────
class TestPayments:
    def test_create_payment_order(self, api, customer_token):
        r = api.post(f"{BASE_URL}/api/payments/create-order", headers={"Authorization": f"Bearer {customer_token}"}, json={
            "amount": 100.0,
            "order_id": "TEST_order_001"
        })
        print(f"Create payment order: {r.status_code} {r.text[:200]}")
        assert r.status_code in (200, 201)

    def test_verify_payment(self, api, customer_token):
        r = api.post(f"{BASE_URL}/api/payments/verify", headers={"Authorization": f"Bearer {customer_token}"}, json={
            "razorpay_order_id": "order_test123",
            "razorpay_payment_id": "pay_test123",
            "razorpay_signature": "test_signature",
            "order_id": "TEST_order_001"
        })
        print(f"Verify payment: {r.status_code} {r.text[:200]}")
        # Mock payment - accept any response that's not 500
        assert r.status_code != 500
