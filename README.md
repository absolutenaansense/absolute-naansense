# Absolute Naansense — Online Ordering System

Full-stack web application for online ordering, table reservations, and PetPooja POS integration.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT + OTP via MSG91 (SMS) |
| Payments | Razorpay (QR / UPI / Cards) |
| Notifications | Firebase Cloud Messaging |
| POS | PetPooja API (KOT push) |
| Hosting | Backend → Railway, Frontend → Vercel |

---

## Project Structure

```
absolute-naansense/
├── backend/          # Express API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/    # PetPooja, Razorpay, SMS, FCM
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env.example
│   └── package.json
└── frontend/         # React + Vite app
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── hooks/
    │   ├── store/       # Zustand state
    │   └── services/    # API calls
    ├── .env.example
    └── package.json
```

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use Railway managed Postgres)
- Accounts: Razorpay, MSG91, Firebase, PetPooja

### 1. Clone & install

```bash
git clone <your-repo>
cd absolute-naansense

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in all values (see .env.example)

# Frontend
cp frontend/.env.example frontend/.env
# Fill in VITE_ prefixed values
```

### 3. Set up database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed     # seeds menu items
```

### 4. Run locally

```bash
# Terminal 1 — backend
cd backend && npm run dev     # runs on :4000

# Terminal 2 — frontend
cd frontend && npm run dev    # runs on :5173
```

---

## Deployment

### Backend (Railway)
1. Create new Railway project → "Deploy from GitHub"
2. Add PostgreSQL plugin in Railway
3. Set all env vars from `.env.example`
4. Railway auto-detects `npm start`

### Frontend (Vercel)
1. Import repo into Vercel
2. Set root to `frontend/`
3. Set `VITE_API_URL` to your Railway backend URL
4. Deploy

---

## PetPooja Integration

1. Log into your PetPooja dashboard → Settings → API
2. Copy `app_key`, `app_secret`, `access_token`
3. Add to backend `.env` as `PETPOOJA_APP_KEY` etc.
4. KOTs are pushed automatically when admin confirms an order via `POST /api/petpooja/create-order`

## Razorpay Setup

1. Create Razorpay account → Dashboard → API Keys
2. Add `key_id` and `key_secret` to `.env`
3. Add webhook URL: `https://your-backend.railway.app/api/payments/webhook`
4. Select events: `payment.captured`

## MSG91 OTP Setup

1. Create MSG91 account → Get Auth Key
2. Create an OTP template and note the Template ID
3. Add `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` to `.env`
