# Zteeel Auth Testing Playbook

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: '',
  role: 'customer',
  phone: '9000000000',
  auth_provider: 'email',
  fcm_token: '',
  created_at: new Date()
});
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```bash
# Register
curl -X POST "https://local-marketplace-81.preview.emergentagent.com/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User","role":"customer"}'

# Login
curl -X POST "https://local-marketplace-81.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test Auth/Me
curl -X GET "https://local-marketplace-81.preview.emergentagent.com/api/auth/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get nearby deals (Mumbai coords)
curl -X GET "https://local-marketplace-81.preview.emergentagent.com/api/customer/deals/nearby?lat=19.0560&lng=72.8310" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Step 3: Seed Data
```bash
curl -X POST "https://local-marketplace-81.preview.emergentagent.com/api/seed"
```

## Checklist
- [ ] User document has user_id field
- [ ] JWT token returned on register/login
- [ ] /api/auth/me returns user data
- [ ] Nearby deals returned with distance
- [ ] Vendor profile creation works
- [ ] Order creation works

## Test Credentials (Seeded)
- Customer: register new account (customer role)
- Vendor 1: maharaja@zteeel.com / vendor123
- Vendor 2: freshjuice@zteeel.com / vendor123
- Vendor 3: pizzahub@zteeel.com / vendor123
