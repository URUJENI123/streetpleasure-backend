# Street Pleasure Backend

**Verified. Safe. Local.** — Node.js + Express + PostgreSQL API

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| PostgreSQL | ≥ 14 (with PostGIS extension) |
| npm | ≥ 9 |

---

## Quick Start (Local)

```bash
# 1. Clone and enter backend
cd streetpleasure/backend

# 2. Install dependencies
npm install

# 3. Copy and fill environment variables
cp .env .env

# 4. Create PostgreSQL database
createdb streetpleasure

# 5. Run migrations (creates all tables)
npm run migrate

# 6. Seed destination data
npm run seed

# 7. Start dev server
npm run dev
# → API running at http://localhost:5000
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (15 min) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (7 days) |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 uploads |
| `AWS_SECRET_ACCESS_KEY` | AWS secret |
| `S3_BUCKET` | S3 bucket name for file storage |
| `SMILE_ID_PARTNER_ID` | Smile Identity partner ID |
| `SMILE_ID_API_KEY` | Smile Identity API key |
| `MOMO_COLLECTION_KEY` | MTN MoMo collection subscription key |
| `MOMO_DISBURSEMENT_KEY` | MTN MoMo disbursement subscription key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `FIREBASE_PROJECT_ID` | Firebase project for FCM |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for SMS OTP |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio sender number |
| `SMTP_HOST` | SMTP server for police report emails |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `RNP_EMAIL` | Rwanda National Police email address |
| `PLATFORM_COMMISSION_PCT` | Commission % taken from paid events (default: 10) |
| `REPORT_LOCK_THRESHOLD` | Reports needed to auto-lock account (default: 2) |
| `REPORT_LOCK_WINDOW_DAYS` | Window in days for report threshold (default: 7) |

---

## API Base URL

```
http://localhost:5000/api
```

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

---

## Running Tests

```bash
npm test
```

---

## Folder Structure

```
backend/
├── server.js              # Entry point — HTTP + Socket.IO + cron
├── src/
│   ├── app.js             # Express app setup
│   ├── config/            # DB, S3, Firebase connections
│   ├── controllers/       # Business logic handlers
│   ├── middleware/        # Auth, rate limiting, validation, upload
│   ├── routes/            # Express route definitions
│   ├── services/          # External API integrations + utilities
│   ├── sockets/           # Socket.IO real-time chat
│   ├── db/
│   │   ├── migrations/    # SQL schema files (run in order)
│   │   ├── migrate.js     # Migration runner
│   │   └── seed.js        # Destination seed data
│   └── utils/             # Errors, geo helpers, crypto
```

---

## WebSocket Events

Connect with:
```js
const socket = io('http://localhost:5000', {
  auth: { token: '<accessToken>' }
});
```

| Event (emit) | Payload | Description |
|---|---|---|
| `chat:join` | `{ chatId }` | Join a chat room |
| `chat:message` | `{ chatId, text }` | Send a message |
| `chat:typing` | `{ chatId, isTyping }` | Typing indicator |
| `chat:leave` | `{ chatId }` | Leave room |

| Event (listen) | Payload | Description |
|---|---|---|
| `chat:history` | `{ chatId, messages[] }` | Last 50 messages on join |
| `chat:message` | Full message object | New message received |
| `chat:typing` | `{ userId, name, isTyping }` | Typing state |
| `chat:system` | `{ text, ts }` | System notification |
| `error` | `{ message }` | Error from server |

---

## Deployment (AWS)

### Backend — EC2

```bash
# On your EC2 instance (Ubuntu 22.04)
sudo apt update && sudo apt install -y nodejs npm postgresql-client

git clone https://github.com/yourrepo/streetpleasure-backend.git
cd streetpleasure/backend
npm ci --omit=dev

# Set production env vars
cp .env. .env && nano .env

# Run with PM2
npm install -g pm2
pm2 start server.js --name streetpleasure-api
pm2 save && pm2 startup
```

### Database — AWS RDS (PostgreSQL 15)

```bash
# Enable PostGIS on your RDS instance
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"

# Run migrations
npm run migrate

# Seed
npm run seed
```

### Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name api.streetpleasure.rw;

    location / {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then add SSL with Certbot:
```bash
sudo certbot --nginx -d api.streetpleasure.rw
```

---

## Safety Architecture

- All national ID numbers are **bcrypt-hashed (cost 12)** before storage — never stored plaintext
- JWT access tokens expire in **15 minutes**; refresh tokens in **7 days**
- Rate limiting: **100 req/min** per IP globally, **10 req/15min** on auth endpoints
- Accounts are **auto-locked** after ≥2 reports from distinct users within 7 days
- Police report packets include: verified ID reference, chat logs, GPS, transaction records — generated as PDF and optionally emailed to RNP
- All file uploads are stored in **AWS S3** (never on the server)
- Input validation via `express-validator` on every endpoint
