"""
Zteeel API – FastAPI + PostgreSQL (PostGIS) backend
"""
import os
import uuid
import json
import hmac
import hashlib
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sqlalchemy import (
    Column, String, Float, Boolean, DateTime, Text, Integer,
    text, event
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

# ─── Config ───────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

JWT_SECRET = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET_KEY environment variable is required")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
ALGORITHM = "HS256"

# ─── Database Setup ────────────────────────────────────────────────────────────
engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ─── ORM Models ───────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(60), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(30), default="")
    role = Column(String(20), default="customer")
    password_hash = Column(Text, default="")
    auth_provider = Column(String(30), default="email")
    picture = Column(Text, default="")
    fcm_token = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Vendor(Base):
    __tablename__ = "vendors"
    id = Column(Integer, primary_key=True, autoincrement=True)
    vendor_id = Column(String(60), unique=True, nullable=False, index=True)
    user_id = Column(String(60), nullable=False, index=True)
    store_name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    category = Column(String(50), default="restaurant")
    opening_time = Column(String(10), default="09:00")
    closing_time = Column(String(10), default="22:00")
    is_active = Column(Boolean, default=True)
    image = Column(Text, default="")
    owner_name = Column(String(255), default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, autoincrement=True)
    item_id = Column(String(60), unique=True, nullable=False, index=True)
    vendor_id = Column(String(60), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    price = Column(Float, nullable=False)
    category = Column(String(50), default="Main")
    is_available = Column(Boolean, default=True)
    image = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Deal(Base):
    __tablename__ = "deals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    deal_id = Column(String(60), unique=True, nullable=False, index=True)
    vendor_id = Column(String(60), nullable=False, index=True)
    vendor_name = Column(String(255), nullable=False)
    vendor_lat = Column(Float, nullable=False)
    vendor_lng = Column(Float, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    type = Column(String(20), nullable=False)   # slow_hour | clearance
    discount_percentage = Column(Float, default=0)
    start_time = Column(String(10), nullable=True)
    end_time = Column(String(10), nullable=True)
    closing_time = Column(String(10), nullable=True)
    is_active = Column(Boolean, default=True)
    radius_km = Column(Float, default=1.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class RewardTier(Base):
    __tablename__ = "reward_tiers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    tier_id = Column(String(60), unique=True, nullable=False, index=True)
    vendor_id = Column(String(60), nullable=False, index=True)
    threshold = Column(Float, nullable=False)
    reward = Column(String(255), nullable=False)
    color = Column(String(30), default="green")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(60), unique=True, nullable=False, index=True)
    customer_id = Column(String(60), nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(30), default="")
    vendor_id = Column(String(60), nullable=False, index=True)
    vendor_name = Column(String(255), nullable=False)
    items = Column(JSONB, default=list)
    subtotal = Column(Float, default=0)
    discount = Column(Float, default=0)
    total = Column(Float, nullable=False)
    status = Column(String(20), default="pending")
    payment_status = Column(String(20), default="pending")
    payment_id = Column(Text, default="")
    deal_id = Column(String(60), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ─── DB Session Dependency ────────────────────────────────────────────────────
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# ─── App Lifecycle ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Auto-seed
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM vendors"))
        count = result.scalar()
        if count == 0:
            await _seed_data(session)
    yield


app = FastAPI(title="Zteeel API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Helpers ──────────────────────────────────────────────────────────────────
def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def row_to_dict(row) -> dict:
    """Convert SQLAlchemy row/model to dict, excluding internal columns."""
    if hasattr(row, "__dict__"):
        d = {k: v for k, v in row.__dict__.items() if not k.startswith("_")}
        # Serialize datetimes
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        return d
    return dict(row._mapping)


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    import math
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2
         + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calc_clearance_discount(closing_time: str, base: float) -> float:
    now = datetime.now()
    h, m = map(int, closing_time.split(":"))
    closing = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if closing < now:
        closing += timedelta(days=1)
    mins = (closing - now).total_seconds() / 60
    if mins > 60:
        return base
    elif mins > 40:
        return base + 10
    elif mins > 20:
        return base + 20
    elif mins > 10:
        return base + 25
    else:
        return min(base + 25, 50)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id = payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(
        text("SELECT * FROM users WHERE user_id = :uid"),
        {"uid": user_id}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")
    user = dict(row)
    if isinstance(user.get("created_at"), datetime):
        user["created_at"] = user["created_at"].isoformat()
    return user


# ─── Pydantic Models ───────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    phone: Optional[str] = ""
    role: str = "customer"


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleAuthRequest(BaseModel):
    session_id: str
    role: str = "customer"


class VendorSetupRequest(BaseModel):
    store_name: str
    description: Optional[str] = ""
    address: str
    latitude: float
    longitude: float
    category: str
    opening_time: str
    closing_time: str


class MenuItemRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category: Optional[str] = "Main"
    is_available: bool = True
    image: Optional[str] = ""


class DealRequest(BaseModel):
    title: str
    description: Optional[str] = ""
    type: str
    discount_percentage: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    closing_time: Optional[str] = None


class RewardTierRequest(BaseModel):
    threshold: float
    reward: str
    color: str


class OrderRequest(BaseModel):
    vendor_id: str
    items: List[dict]
    total: float
    deal_id: Optional[str] = None
    discount: float = 0.0


class PaymentOrderRequest(BaseModel):
    amount: float
    order_id: Optional[str] = None


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str


# ─── Auth Endpoints ───────────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT user_id FROM users WHERE email = :email"),
        {"email": data.email}
    )
    if result.first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.execute(
        text("""INSERT INTO users (user_id, email, name, phone, role, password_hash,
                    auth_provider, picture, fcm_token, created_at)
                VALUES (:uid, :email, :name, :phone, :role, :pw,
                    'email', '', '', NOW())"""),
        {
            "uid": user_id, "email": data.email, "name": data.name,
            "phone": data.phone or "", "role": data.role,
            "pw": pwd_context.hash(data.password),
        }
    )
    await db.commit()
    return {"token": create_token(user_id), "user_id": user_id, "role": data.role, "name": data.name}


@app.post("/api/auth/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": data.email}
    )
    row = result.mappings().first()
    if not row or not pwd_context.verify(data.password, row.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": create_token(row["user_id"]),
        "user_id": row["user_id"],
        "role": row["role"],
        "name": row["name"],
        "picture": row.get("picture", ""),
    }


@app.post("/api/auth/google")
async def google_auth(data: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    resp = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": data.session_id},
        timeout=15,
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    ud = resp.json()
    email = ud.get("email", "")
    name = ud.get("name", "")
    picture = ud.get("picture", "")

    result = await db.execute(
        text("SELECT * FROM users WHERE email = :email"), {"email": email}
    )
    existing = result.mappings().first()
    if existing:
        user_id = existing["user_id"]
        role = existing["role"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = data.role
        await db.execute(
            text("""INSERT INTO users (user_id, email, name, picture, role,
                        auth_provider, phone, fcm_token, created_at)
                    VALUES (:uid, :email, :name, :pic, :role,
                        'google', '', '', NOW())"""),
            {"uid": user_id, "email": email, "name": name, "pic": picture, "role": role}
        )
        await db.commit()
    return {"token": create_token(user_id), "user_id": user_id, "role": role, "name": name, "picture": picture}


@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@app.put("/api/auth/fcm-token")
async def update_fcm_token(data: dict, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        text("UPDATE users SET fcm_token = :token WHERE user_id = :uid"),
        {"token": data.get("token", ""), "uid": current_user["user_id"]}
    )
    await db.commit()
    return {"success": True}


# ─── Vendor Profile ───────────────────────────────────────────────────────────
@app.post("/api/vendor/setup")
async def setup_vendor(
    data: VendorSetupRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    existing = result.mappings().first()
    if existing:
        await db.execute(
            text("""UPDATE vendors SET store_name=:sn, description=:desc, address=:addr,
                    latitude=:lat, longitude=:lng, category=:cat,
                    opening_time=:ot, closing_time=:ct, updated_at=NOW()
                    WHERE user_id = :uid"""),
            {
                "sn": data.store_name, "desc": data.description, "addr": data.address,
                "lat": data.latitude, "lng": data.longitude, "cat": data.category,
                "ot": data.opening_time, "ct": data.closing_time,
                "uid": current_user["user_id"],
            }
        )
        await db.commit()
        return {"vendor_id": existing["vendor_id"], "success": True}

    vendor_id = f"vendor_{uuid.uuid4().hex[:12]}"
    await db.execute(
        text("""INSERT INTO vendors (vendor_id, user_id, store_name, description, address,
                    latitude, longitude, category, opening_time, closing_time,
                    is_active, image, owner_name, created_at, updated_at)
                VALUES (:vid, :uid, :sn, :desc, :addr, :lat, :lng, :cat,
                    :ot, :ct, TRUE, '', :on, NOW(), NOW())"""),
        {
            "vid": vendor_id, "uid": current_user["user_id"],
            "sn": data.store_name, "desc": data.description, "addr": data.address,
            "lat": data.latitude, "lng": data.longitude, "cat": data.category,
            "ot": data.opening_time, "ct": data.closing_time,
            "on": current_user["name"],
        }
    )
    await db.commit()
    return {"vendor_id": vendor_id, "success": True}


@app.get("/api/vendor/profile")
async def get_vendor_profile(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM vendors WHERE user_id = :uid"), {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        return {}
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@app.put("/api/vendor/profile")
async def update_vendor_profile(
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data.pop("id", None)
    allowed = ["store_name", "description", "address", "latitude", "longitude",
               "category", "opening_time", "closing_time", "image"]
    sets = ", ".join([f"{k} = :{k}" for k in allowed if k in data])
    if sets:
        params = {k: data[k] for k in allowed if k in data}
        params["uid"] = current_user["user_id"]
        await db.execute(
            text(f"UPDATE vendors SET {sets}, updated_at=NOW() WHERE user_id = :uid"),
            params
        )
        await db.commit()
    return {"success": True}


# ─── Menu ─────────────────────────────────────────────────────────────────────
@app.get("/api/vendor/menu")
async def get_vendor_menu(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        return []
    items_result = await db.execute(
        text("SELECT * FROM menu_items WHERE vendor_id = :vid ORDER BY category, name"),
        {"vid": row["vendor_id"]}
    )
    out = []
    for r in items_result.mappings():
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        out.append(d)
    return out


@app.post("/api/vendor/menu")
async def create_menu_item(
    data: MenuItemRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor profile not found. Please set up your store first.")
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    await db.execute(
        text("""INSERT INTO menu_items (item_id, vendor_id, name, description, price,
                    category, is_available, image, created_at)
                VALUES (:iid, :vid, :name, :desc, :price, :cat, :avail, :img, NOW())"""),
        {
            "iid": item_id, "vid": row["vendor_id"], "name": data.name,
            "desc": data.description, "price": data.price, "cat": data.category,
            "avail": data.is_available, "img": data.image,
        }
    )
    await db.commit()
    return {"item_id": item_id, "success": True}


@app.put("/api/vendor/menu/{item_id}")
async def update_menu_item(
    item_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    allowed = ["name", "description", "price", "category", "is_available", "image"]
    sets = ", ".join([f"{k} = :{k}" for k in allowed if k in data])
    if sets:
        params = {k: data[k] for k in allowed if k in data}
        params["iid"] = item_id
        await db.execute(text(f"UPDATE menu_items SET {sets} WHERE item_id = :iid"), params)
        await db.commit()
    return {"success": True}


@app.delete("/api/vendor/menu/{item_id}")
async def delete_menu_item(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM menu_items WHERE item_id = :iid"), {"iid": item_id})
    await db.commit()
    return {"success": True}


# ─── Vendor Deals ─────────────────────────────────────────────────────────────
@app.get("/api/vendor/deals")
async def get_vendor_deals(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        return []
    deals_result = await db.execute(
        text("SELECT * FROM deals WHERE vendor_id = :vid ORDER BY created_at DESC"),
        {"vid": row["vendor_id"]}
    )
    out = []
    for r in deals_result.mappings():
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        out.append(d)
    return out


@app.post("/api/vendor/deals")
async def create_deal(
    data: DealRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    vendor = result.mappings().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    deal_id = f"deal_{uuid.uuid4().hex[:12]}"
    radius = 1.0 if data.type == "slow_hour" else 3.0
    await db.execute(
        text("""INSERT INTO deals (deal_id, vendor_id, vendor_name, vendor_lat, vendor_lng,
                    title, description, type, discount_percentage, start_time, end_time,
                    closing_time, is_active, radius_km, created_at)
                VALUES (:did, :vid, :vn, :vlat, :vlng, :title, :desc, :type,
                    :disc, :st, :et, :ct, TRUE, :radius, NOW())"""),
        {
            "did": deal_id, "vid": vendor["vendor_id"], "vn": vendor["store_name"],
            "vlat": vendor["latitude"], "vlng": vendor["longitude"],
            "title": data.title, "desc": data.description, "type": data.type,
            "disc": data.discount_percentage, "st": data.start_time, "et": data.end_time,
            "ct": data.closing_time, "radius": radius,
        }
    )
    await db.commit()
    return {"deal_id": deal_id, "success": True}


@app.put("/api/vendor/deals/{deal_id}")
async def update_deal(
    deal_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    allowed = ["title", "description", "discount_percentage", "start_time",
               "end_time", "closing_time", "is_active"]
    sets = ", ".join([f"{k} = :{k}" for k in allowed if k in data])
    if sets:
        params = {k: data[k] for k in allowed if k in data}
        params["did"] = deal_id
        await db.execute(text(f"UPDATE deals SET {sets} WHERE deal_id = :did"), params)
        await db.commit()
    return {"success": True}


@app.delete("/api/vendor/deals/{deal_id}")
async def delete_deal(
    deal_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM deals WHERE deal_id = :did"), {"did": deal_id})
    await db.commit()
    return {"success": True}


# ─── Reward Tiers ─────────────────────────────────────────────────────────────
@app.get("/api/vendor/rewards")
async def get_rewards(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        return []
    tiers = await db.execute(
        text("SELECT * FROM reward_tiers WHERE vendor_id = :vid ORDER BY threshold"),
        {"vid": row["vendor_id"]}
    )
    return [dict(r) for r in tiers.mappings()]


@app.post("/api/vendor/rewards")
async def create_reward(
    data: RewardTierRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    tier_id = f"tier_{uuid.uuid4().hex[:12]}"
    await db.execute(
        text("INSERT INTO reward_tiers (tier_id, vendor_id, threshold, reward, color) VALUES (:tid, :vid, :threshold, :reward, :color)"),
        {"tid": tier_id, "vid": row["vendor_id"], "threshold": data.threshold, "reward": data.reward, "color": data.color}
    )
    await db.commit()
    return {"tier_id": tier_id, "success": True}


@app.delete("/api/vendor/rewards/{tier_id}")
async def delete_reward(
    tier_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(text("DELETE FROM reward_tiers WHERE tier_id = :tid"), {"tid": tier_id})
    await db.commit()
    return {"success": True}


# ─── Vendor Analytics ─────────────────────────────────────────────────────────
@app.get("/api/vendor/analytics")
async def get_analytics(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    vid = row["vendor_id"]

    today_result = await db.execute(
        text("""SELECT * FROM orders
                WHERE vendor_id = :vid
                  AND payment_status = 'paid'
                  AND created_at >= CURRENT_DATE
                ORDER BY created_at DESC"""),
        {"vid": vid}
    )
    today_orders = [dict(r) for r in today_result.mappings()]

    all_result = await db.execute(
        text("SELECT * FROM orders WHERE vendor_id = :vid AND payment_status = 'paid' ORDER BY created_at DESC LIMIT 200"),
        {"vid": vid}
    )
    all_paid = [dict(r) for r in all_result.mappings()]

    revenue = sum(o.get("total", 0) for o in today_orders)
    items_sold = sum(
        sum(i.get("quantity", 1) for i in (o.get("items") or []))
        for o in today_orders
    )
    avg_order = revenue / len(today_orders) if today_orders else 0
    deal_orders = [o for o in today_orders if (o.get("discount") or 0) > 0]
    redemption = (len(deal_orders) / len(today_orders) * 100) if today_orders else 0

    hour_counts: dict = {}
    for o in all_paid[-100:]:
        ca = o.get("created_at")
        if ca:
            if isinstance(ca, str):
                ca = datetime.fromisoformat(ca)
            hour_counts[str(ca.hour)] = hour_counts.get(str(ca.hour), 0) + 1

    return {
        "daily_revenue": round(revenue, 2),
        "items_sold": items_sold,
        "deal_redemption_rate": round(redemption, 1),
        "average_order_value": round(avg_order, 2),
        "total_orders": len(today_orders),
        "total_orders_all": len(all_paid),
        "peak_hours": hour_counts,
    }


# ─── Vendor Orders ────────────────────────────────────────────────────────────
@app.get("/api/vendor/orders")
async def get_vendor_orders(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT vendor_id FROM vendors WHERE user_id = :uid"),
        {"uid": current_user["user_id"]}
    )
    row = result.mappings().first()
    if not row:
        return []
    orders = await db.execute(
        text("SELECT * FROM orders WHERE vendor_id = :vid ORDER BY created_at DESC LIMIT 50"),
        {"vid": row["vendor_id"]}
    )
    out = []
    for r in orders.mappings():
        d = dict(r)
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        out.append(d)
    return out


@app.put("/api/vendor/orders/{order_id}")
async def update_order_status(
    order_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        text("UPDATE orders SET status = :status, updated_at = NOW() WHERE order_id = :oid"),
        {"status": data.get("status"), "oid": order_id}
    )
    await db.commit()
    return {"success": True}


# ─── Customer Discovery (PostGIS) ─────────────────────────────────────────────
@app.get("/api/customer/deals/nearby")
async def get_nearby_deals(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Use PostGIS ST_DWithin for accurate geospatial query
    # We check against both slow_hour (1km) and clearance (3km) radius
    result = await db.execute(
        text("""
            SELECT d.*,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(d.vendor_lng, d.vendor_lat), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ) / 1000.0 AS distance_km_exact
            FROM deals d
            WHERE d.is_active = TRUE
              AND ST_DWithin(
                  ST_SetSRID(ST_MakePoint(d.vendor_lng, d.vendor_lat), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                  d.radius_km * 1000
              )
            ORDER BY distance_km_exact
        """),
        {"lat": lat, "lng": lng}
    )
    out = []
    for row in result.mappings():
        d = dict(row)
        dist = round(float(d.pop("distance_km_exact", 0) or 0), 2)
        d["distance_km"] = dist
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        if d.get("type") == "clearance" and d.get("closing_time"):
            d["current_discount"] = calc_clearance_discount(
                d["closing_time"], d.get("discount_percentage", 10)
            )
        else:
            d["current_discount"] = d.get("discount_percentage", 0)
        out.append(d)
    return out


@app.get("/api/customer/vendors/nearby")
async def get_nearby_vendors(
    lat: float,
    lng: float,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("""
            SELECT v.*,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(v.longitude, v.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ) / 1000.0 AS distance_km_exact
            FROM vendors v
            WHERE v.is_active = TRUE
              AND ST_DWithin(
                  ST_SetSRID(ST_MakePoint(v.longitude, v.latitude), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                  5000
              )
            ORDER BY distance_km_exact
        """),
        {"lat": lat, "lng": lng}
    )
    out = []
    for row in result.mappings():
        d = dict(row)
        dist = round(float(d.pop("distance_km_exact", 0) or 0), 2)
        d["distance_km"] = dist
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        # Count active deals
        deals_result = await db.execute(
            text("SELECT COUNT(*) FROM deals WHERE vendor_id = :vid AND is_active = TRUE"),
            {"vid": d["vendor_id"]}
        )
        d["active_deals"] = deals_result.scalar() or 0
        out.append(d)
    return out


@app.get("/api/customer/vendors/{vendor_id}")
async def get_vendor_detail(
    vendor_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM vendors WHERE vendor_id = :vid"),
        {"vid": vendor_id}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Vendor not found")
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@app.get("/api/customer/vendors/{vendor_id}/menu")
async def get_vendor_menu_public(
    vendor_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM menu_items WHERE vendor_id = :vid AND is_available = TRUE ORDER BY category, name"),
        {"vid": vendor_id}
    )
    out = []
    for row in result.mappings():
        d = dict(row)
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        out.append(d)
    return out


@app.get("/api/customer/vendors/{vendor_id}/deals")
async def get_vendor_deals_public(
    vendor_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM deals WHERE vendor_id = :vid AND is_active = TRUE ORDER BY created_at DESC"),
        {"vid": vendor_id}
    )
    out = []
    for row in result.mappings():
        d = dict(row)
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        if d.get("type") == "clearance" and d.get("closing_time"):
            d["current_discount"] = calc_clearance_discount(d["closing_time"], d.get("discount_percentage", 10))
        else:
            d["current_discount"] = d.get("discount_percentage", 0)
        out.append(d)
    return out


@app.get("/api/customer/vendors/{vendor_id}/rewards")
async def get_vendor_rewards(
    vendor_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM reward_tiers WHERE vendor_id = :vid ORDER BY threshold"),
        {"vid": vendor_id}
    )
    return [dict(r) for r in result.mappings()]


# ─── Orders ───────────────────────────────────────────────────────────────────
@app.post("/api/orders")
async def create_order(
    data: OrderRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT store_name FROM vendors WHERE vendor_id = :vid"),
        {"vid": data.vendor_id}
    )
    vendor = result.mappings().first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    order_id = f"ZT{uuid.uuid4().hex[:8].upper()}"
    subtotal = sum(i.get("price", 0) * i.get("quantity", 1) for i in data.items)
    await db.execute(
        text("""INSERT INTO orders (order_id, customer_id, customer_name, customer_phone,
                    vendor_id, vendor_name, items, subtotal, discount, total,
                    status, payment_status, payment_id, deal_id, created_at, updated_at)
                VALUES (:oid, :cid, :cn, :cp, :vid, :vn, cast(:items as jsonb),
                    :sub, :disc, :total, 'pending', 'pending', '', :did, NOW(), NOW())"""),
        {
            "oid": order_id, "cid": current_user["user_id"],
            "cn": current_user["name"], "cp": current_user.get("phone", ""),
            "vid": data.vendor_id, "vn": vendor["store_name"],
            "items": json.dumps(data.items), "sub": round(subtotal, 2),
            "disc": round(data.discount, 2), "total": round(data.total, 2),
            "did": data.deal_id,
        }
    )
    await db.commit()
    return {"order_id": order_id, "success": True}


@app.get("/api/orders")
async def get_customer_orders(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM orders WHERE customer_id = :cid ORDER BY created_at DESC LIMIT 50"),
        {"cid": current_user["user_id"]}
    )
    out = []
    for row in result.mappings():
        d = dict(row)
        for k, v in d.items():
            if isinstance(v, datetime):
                d[k] = v.isoformat()
        out.append(d)
    return out


@app.get("/api/orders/{order_id}")
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        text("SELECT * FROM orders WHERE order_id = :oid"), {"oid": order_id}
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


# ─── Payments ─────────────────────────────────────────────────────────────────
@app.post("/api/payments/create-order")
async def create_payment_order(
    data: PaymentOrderRequest,
    current_user: dict = Depends(get_current_user)
):
    amount_paise = int(data.amount * 100)
    is_mock = not RAZORPAY_KEY_ID or RAZORPAY_KEY_ID in ("rzp_test_placeholder", "")
    if is_mock:
        return {
            "razorpay_order_id": f"order_mock_{uuid.uuid4().hex[:12]}",
            "amount": amount_paise,
            "currency": "INR",
            "key_id": "rzp_test_mock",
            "is_mock": True,
        }
    try:
        import razorpay as rz
        client = rz.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        order = client.order.create({"amount": amount_paise, "currency": "INR", "payment_capture": 1})
        return {
            "razorpay_order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,
            "is_mock": False,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/payments/verify")
async def verify_payment(
    data: PaymentVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    is_mock = not RAZORPAY_KEY_ID or RAZORPAY_KEY_ID in ("rzp_test_placeholder", "")
    if is_mock or data.razorpay_order_id.startswith("order_mock_"):
        await db.execute(
            text("""UPDATE orders SET payment_status = 'paid', payment_id = :pid,
                    status = 'confirmed', updated_at = NOW()
                    WHERE order_id = :oid"""),
            {"pid": data.razorpay_payment_id, "oid": data.order_id}
        )
        await db.commit()
        return {"success": True, "verified": True}
    try:
        import razorpay as rz
        client = rz.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        client.utility.verify_payment_signature({
            "razorpay_order_id": data.razorpay_order_id,
            "razorpay_payment_id": data.razorpay_payment_id,
            "razorpay_signature": data.razorpay_signature,
        })
        await db.execute(
            text("""UPDATE orders SET payment_status = 'paid', payment_id = :pid,
                    status = 'confirmed', updated_at = NOW()
                    WHERE order_id = :oid"""),
            {"pid": data.razorpay_payment_id, "oid": data.order_id}
        )
        await db.commit()
        return {"success": True, "verified": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_status = "postgresql_ok"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "ok", "app": "Zteeel API v2.0 (PostgreSQL)", "database": db_status}


# ─── Manual Seed ──────────────────────────────────────────────────────────────
@app.post("/api/seed")
async def seed_endpoint(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT COUNT(*) FROM vendors"))
    count = result.scalar()
    if count > 0:
        return {"message": "Seed data already exists", "vendors": count}
    await _seed_data(db)
    return {"message": "Seed data created!", "vendors": 3}


# ─── Seed Logic ───────────────────────────────────────────────────────────────
async def _seed_data(db: AsyncSession):
    pw = pwd_context.hash("vendor123")

    # Users
    users = [
        ("user_vendor001", "maharaja@zteeel.com", "Maharaja Kitchen", "vendor", pw),
        ("user_vendor002", "freshjuice@zteeel.com", "Fresh Sip Juicery", "vendor", pw),
        ("user_vendor003", "pizzahub@zteeel.com", "Pizza Hub Express", "vendor", pw),
    ]
    for uid, email, name, role, pw_hash in users:
        await db.execute(
            text("""INSERT INTO users (user_id, email, name, phone, role, password_hash,
                        auth_provider, picture, fcm_token, created_at)
                    VALUES (:uid, :email, :name, '9876543210', :role, :pw,
                        'email', '', '', NOW())
                    ON CONFLICT (user_id) DO NOTHING"""),
            {"uid": uid, "email": email, "name": name, "role": role, "pw": pw_hash}
        )

    # Vendors
    vendors = [
        ("vendor_001", "user_vendor001", "Maharaja Kitchen",
         "Authentic North Indian cuisine with rich curries and fresh breads",
         "Shop 12, Bandra West, Mumbai", 19.0540, 72.8296, "restaurant", "11:00", "23:00"),
        ("vendor_002", "user_vendor002", "Fresh Sip Juicery",
         "Cold-pressed juices, smoothies and healthy snacks",
         "Plot 5, Linking Road, Bandra, Mumbai", 19.0578, 72.8372, "juice_bar", "08:00", "22:00"),
        ("vendor_003", "user_vendor003", "Pizza Hub Express",
         "Wood-fired artisan pizzas with premium toppings",
         "14 Hill Road, Bandra, Mumbai", 19.0602, 72.8310, "restaurant", "12:00", "23:30"),
    ]
    for vid, uid, sn, desc, addr, lat, lng, cat, ot, ct in vendors:
        await db.execute(
            text("""INSERT INTO vendors (vendor_id, user_id, store_name, description, address,
                        latitude, longitude, category, opening_time, closing_time,
                        is_active, image, owner_name, created_at, updated_at)
                    VALUES (:vid, :uid, :sn, :desc, :addr, :lat, :lng, :cat,
                        :ot, :ct, TRUE, '', :sn, NOW(), NOW())
                    ON CONFLICT (vendor_id) DO NOTHING"""),
            {"vid": vid, "uid": uid, "sn": sn, "desc": desc, "addr": addr,
             "lat": lat, "lng": lng, "cat": cat, "ot": ot, "ct": ct}
        )

    # Menu items
    menu_items = [
        ("item_m01", "vendor_001", "Butter Chicken", "Tender chicken in creamy tomato sauce", 280, "Main"),
        ("item_m02", "vendor_001", "Dal Makhani", "Slow-cooked black lentils in butter", 180, "Main"),
        ("item_m03", "vendor_001", "Garlic Naan", "Fresh baked flatbread with garlic", 45, "Bread"),
        ("item_m04", "vendor_001", "Mango Lassi", "Sweet mango yogurt drink", 80, "Drinks"),
        ("item_m05", "vendor_001", "Paneer Tikka", "Grilled cottage cheese with spices", 220, "Starter"),
        ("item_f01", "vendor_002", "Watermelon Mint Cooler", "Fresh watermelon with mint and black salt", 120, "Juice"),
        ("item_f02", "vendor_002", "Mango Papaya Blend", "Tropical fruit powerhouse", 140, "Smoothie"),
        ("item_f03", "vendor_002", "Green Detox Shot", "Wheatgrass, amla, and ginger", 80, "Shots"),
        ("item_f04", "vendor_002", "Lemon Chia Cooler", "Lemon water with chia seeds", 90, "Juice"),
        ("item_p01", "vendor_003", "Margherita Pizza", "Classic tomato, mozzarella, basil", 280, "Pizza"),
        ("item_p02", "vendor_003", "Paneer Tikka Pizza", "Spicy paneer with peppers and onion", 320, "Pizza"),
        ("item_p03", "vendor_003", "Garlic Bread", "Toasted bread with garlic butter", 120, "Sides"),
        ("item_p04", "vendor_003", "Chocolate Lava Cake", "Warm chocolate cake with ice cream", 180, "Dessert"),
    ]
    for iid, vid, name, desc, price, cat in menu_items:
        await db.execute(
            text("""INSERT INTO menu_items (item_id, vendor_id, name, description, price,
                        category, is_available, image, created_at)
                    VALUES (:iid, :vid, :name, :desc, :price, :cat, TRUE, '', NOW())
                    ON CONFLICT (item_id) DO NOTHING"""),
            {"iid": iid, "vid": vid, "name": name, "desc": desc, "price": price, "cat": cat}
        )

    # Deals
    deals = [
        ("deal_001", "vendor_001", "Maharaja Kitchen", 19.0540, 72.8296,
         "Afternoon Delight", "20% off all mains during slow afternoon hours!",
         "slow_hour", 20, "14:00", "17:00", None, 1.0),
        ("deal_002", "vendor_002", "Fresh Sip Juicery", 19.0578, 72.8372,
         "Closing Time Clearance", "Discount increases as we approach closing!",
         "clearance", 10, "20:00", "22:00", "22:00", 3.0),
        ("deal_003", "vendor_003", "Pizza Hub Express", 19.0602, 72.8310,
         "Late Night Pizza Deal", "Save 15% on all pizzas after 10 PM!",
         "slow_hour", 15, "22:00", "23:30", None, 1.0),
    ]
    for did, vid, vn, vlat, vlng, title, desc, dtype, disc, st, et, ct, radius in deals:
        await db.execute(
            text("""INSERT INTO deals (deal_id, vendor_id, vendor_name, vendor_lat, vendor_lng,
                        title, description, type, discount_percentage, start_time, end_time,
                        closing_time, is_active, radius_km, created_at)
                    VALUES (:did, :vid, :vn, :vlat, :vlng, :title, :desc, :dtype,
                        :disc, :st, :et, :ct, TRUE, :radius, NOW())
                    ON CONFLICT (deal_id) DO NOTHING"""),
            {"did": did, "vid": vid, "vn": vn, "vlat": vlat, "vlng": vlng,
             "title": title, "desc": desc, "dtype": dtype, "disc": disc,
             "st": st, "et": et, "ct": ct, "radius": radius}
        )

    # Reward tiers
    tiers = [
        ("tier_001", "vendor_001", 200, "Free Lemon Juice", "green"),
        ("tier_002", "vendor_001", 300, "Free Watermelon Juice", "yellow"),
        ("tier_003", "vendor_001", 400, "Free Dessert", "orange"),
        ("tier_004", "vendor_002", 150, "Free Green Shot", "green"),
        ("tier_005", "vendor_002", 250, "Free Smoothie Upgrade", "yellow"),
        ("tier_006", "vendor_003", 300, "Free Garlic Bread", "green"),
        ("tier_007", "vendor_003", 500, "Free Chocolate Lava Cake", "orange"),
    ]
    for tid, vid, threshold, reward, color in tiers:
        await db.execute(
            text("""INSERT INTO reward_tiers (tier_id, vendor_id, threshold, reward, color)
                    VALUES (:tid, :vid, :threshold, :reward, :color)
                    ON CONFLICT (tier_id) DO NOTHING"""),
            {"tid": tid, "vid": vid, "threshold": threshold, "reward": reward, "color": color}
        )

    await db.commit()
