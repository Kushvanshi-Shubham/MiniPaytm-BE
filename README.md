# MiniPaytm Backend

Backend API for the MiniPaytm application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (see `.env.example`)

3. Start MongoDB

4. Run the server:
```bash
npm run dev
```

## API Documentation

### User Routes

#### POST /api/v1/user/signup
Create a new user account
```json
{
  "username": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "password123"
}
```

#### POST /api/v1/user/signin
Login user
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

#### GET /api/v1/user/me
Get current user info (requires auth)

#### PUT /api/v1/user
Update user details (requires auth)
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "password": "newpassword123"
}
```

#### GET /api/v1/user/bulk?filter=name
Search users by name (requires auth)

### Account Routes

#### GET /api/v1/account/balance
Get account balance (requires auth)

#### POST /api/v1/account/transfer
Transfer money (requires auth)
```json
{
  "to": "userId",
  "amount": 10000
}
```
Note: Amount is in paise (100 paise = 1 rupee)

## Features

- JWT authentication
- Bcrypt password hashing
- MongoDB transactions
- Zod validation
- Rate limiting
- Error handling
- CORS configuration
