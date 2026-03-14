# Zteeel App - Product Requirements Document

## App Overview
**Zteeel** - A cross-platform mobile application (iOS & Android) connecting customers with local restaurants/stores offering time-based deals.

## Two Apps in One
1. **Customer App** - Find and redeem nearby deals
2. **Vendor App** - Create deals and manage orders

## Tech Stack
- **Frontend:** React Native with Expo (SDK 54)
- **Backend:** FastAPI (Python)
- **Database:** PostgreSQL 15 + PostGIS 3.3 (geolocation)
- **Auth:** JWT (email/password) + Google OAuth
- **Payments:** Razorpay (test/mock mode)
- **Maps:** react-native-maps (placeholder Google Maps key)
- **Routing:** Expo Router (file-based)

## Database Schema (PostgreSQL)
- **users** - user_id, email, name, role, password_hash, auth_provider
- **vendors** - vendor_id, user_id, store_name, address, latitude, longitude, category
- **menu_items** - item_id, vendor_id, name, price, category, is_available
- **deals** - deal_id, vendor_id, title, type (slow_hour|clearance), discount_percentage, time fields
- **reward_tiers** - tier_id, vendor_id, threshold, reward, color
- **orders** - order_id, customer_id, vendor_id, items (JSONB), total, status, payment_status

## Core Features

### Customer App
1. **Location-based Discovery** - GPS detection, show deals within 1km (slow hour) and 3km (clearance)
2. **Deal Types** - Slow Hour deals (fixed discount) and Dynamic Clearance deals (auto-increasing discount near closing)
3. **Map View** - Vendor pins on map with distance, active deals count
4. **Menu Browsing** - Browse items by category, see discounted prices
5. **Cart System** - Add/remove items, quantity controls
6. **Reward Progress Bar** - Tiered rewards that unlock as cart value increases
7. **Payment** - Razorpay UPI integration (test mode)
8. **Order History** - View past orders with status tracking

### Vendor App
1. **Store Setup** - Configure store profile, location, operating hours
2. **Deal Management** - Create/pause/delete deals (slow hour or clearance type)
3. **Menu Management** - Add/edit/delete menu items with categories
4. **Order Management** - Accept/decline orders, update status
5. **Analytics Dashboard** - Revenue, orders, peak hours, deal redemption rates
6. **Reward Tiers** - Set cart value thresholds for free item rewards

## API Endpoints (all prefixed with /api)
- **Auth:** POST /auth/register, /auth/login, /auth/google, GET /auth/me
- **Vendor:** POST /vendor/setup, GET/PUT /vendor/profile, GET/POST/PUT/DELETE /vendor/menu, /vendor/deals, /vendor/rewards
- **Customer:** GET /customer/deals/nearby, /customer/vendors/nearby, /customer/vendors/{id}, /customer/vendors/{id}/menu
- **Orders:** POST /orders, GET /orders, GET /orders/{id}, PUT /vendor/orders/{id}
- **Payments:** POST /payments/create-order, /payments/verify
- **Analytics:** GET /vendor/analytics

## Geolocation (PostGIS)
- Slow Hour deals: within 1km radius using ST_DWithin
- Clearance deals: within 3km radius using ST_DWithin  
- Distance returned using ST_Distance in km

## Dynamic Pricing (Clearance Deals)
- 60+ min before closing → base discount
- 40 min before → base + 10%
- 20 min before → base + 20%
- 10 min before → base + 25%

## Demo Accounts (Seed Data)
- Vendor: maharaja@zteeel.com / vendor123
- Vendor: freshjuice@zteeel.com / vendor123
- Vendor: pizzahub@zteeel.com / vendor123

## Environment Variables (to replace placeholders)
- RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET → Razorpay dashboard
- EXPO_PUBLIC_GOOGLE_MAPS_API_KEY → Google Cloud Console
- Firebase config → Firebase Console (for push notifications)

## Status
- Phase 1 (Core Infrastructure) ✅
- Phase 2 (Core Marketplace) ✅  
- Phase 3 (Commerce) ✅
- Phase 4 (Operations) ✅ (basic version)
