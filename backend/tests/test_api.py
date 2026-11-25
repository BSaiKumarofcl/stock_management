from .conftest import signup


def product(**kw):
    base = {"name": "Widget", "sku": "W-1", "quantity_on_hand": 10}
    base.update(kw)
    return base


def test_signup_login_me(client):
    signup(client)
    r = client.post("/api/auth/login", json={"email": "A@example.com", "password": "password123"})
    assert r.status_code == 200
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    me = client.get("/api/auth/me", headers=h).json()
    assert me["organization_name"] == "Org A"


def test_duplicate_email_and_bad_login(client):
    signup(client)
    r = client.post(
        "/api/auth/signup",
        json={"email": "a@example.com", "password": "password123", "organization_name": "X"},
    )
    assert r.status_code == 409
    r = client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_requires_auth(client):
    assert client.get("/api/products").status_code == 401
    assert client.get("/api/dashboard").status_code == 401


def test_product_crud_and_sku_unique(client, auth):
    r = client.post("/api/products", json=product(), headers=auth)
    assert r.status_code == 201
    pid = r.json()["id"]
    assert client.post("/api/products", json=product(), headers=auth).status_code == 409

    r = client.put(f"/api/products/{pid}", json=product(name="Widget 2", quantity_on_hand=3), headers=auth)
    assert r.status_code == 200 and r.json()["name"] == "Widget 2"

    assert len(client.get("/api/products?q=widget", headers=auth).json()) == 1
    assert client.get("/api/products?q=nomatch", headers=auth).json() == []

    assert client.delete(f"/api/products/{pid}", headers=auth).status_code == 204
    assert client.get(f"/api/products/{pid}", headers=auth).status_code == 404


def test_validation(client, auth):
    assert client.post("/api/products", json=product(name="  "), headers=auth).status_code == 422
    assert client.post("/api/products", json=product(quantity_on_hand=-1), headers=auth).status_code == 422


def test_low_stock_and_default_threshold(client, auth):
    client.post("/api/products", json=product(sku="A", quantity_on_hand=4), headers=auth)  # below default 5
    client.post("/api/products", json=product(sku="B", quantity_on_hand=5), headers=auth)  # at threshold -> not low
    client.post(
        "/api/products", json=product(sku="C", quantity_on_hand=20, low_stock_threshold=20), headers=auth
    )  # at product threshold -> not low
    client.post(
        "/api/products", json=product(sku="D", quantity_on_hand=3, low_stock_threshold=2), headers=auth
    )  # per-product values cannot lower the organization minimum
    d = client.get("/api/dashboard", headers=auth).json()
    assert d["total_products"] == 4
    assert d["total_quantity"] == 32
    assert {i["sku"] for i in d["low_stock_items"]} == {"A", "D"}
    products = {p["sku"]: p for p in client.get("/api/products", headers=auth).json()}
    assert products["A"]["is_low_stock"] is True
    assert products["B"]["is_low_stock"] is False
    assert products["D"]["effective_low_stock_threshold"] == 5
    assert products["D"]["is_low_stock"] is True

    client.put("/api/settings", json={"default_low_stock_threshold": 10}, headers=auth)
    d = client.get("/api/dashboard", headers=auth).json()
    assert {i["sku"] for i in d["low_stock_items"]} == {"A", "B", "D"}
    assert client.put("/api/settings", json={"default_low_stock_threshold": 4}, headers=auth).status_code == 422


def test_adjust_stock(client, auth):
    pid = client.post("/api/products", json=product(quantity_on_hand=4), headers=auth).json()["id"]
    r = client.post(f"/api/products/{pid}/adjust", json={"delta": 6, "note": "restock"}, headers=auth)
    assert r.json()["quantity_on_hand"] == 10
    r = client.post(f"/api/products/{pid}/adjust", json={"delta": -11}, headers=auth)
    assert r.status_code == 422
    assert client.get(f"/api/products/{pid}", headers=auth).json()["quantity_on_hand"] == 10
    assert client.post(f"/api/products/{pid}/adjust", json={"delta": 0}, headers=auth).status_code == 422


def test_tenant_isolation(client, auth):
    pid = client.post("/api/products", json=product(), headers=auth).json()["id"]
    other = signup(client, email="b@example.com", org="Org B")
    assert client.get("/api/products", headers=other).json() == []
    assert client.get(f"/api/products/{pid}", headers=other).status_code == 404
    assert client.put(f"/api/products/{pid}", json=product(), headers=other).status_code == 404
    assert client.delete(f"/api/products/{pid}", headers=other).status_code == 404
    assert client.post(f"/api/products/{pid}/adjust", json={"delta": 1}, headers=other).status_code == 404
    assert client.get("/api/dashboard", headers=other).json()["total_products"] == 0
    # same SKU allowed in another org
    assert client.post("/api/products", json=product(), headers=other).status_code == 201
