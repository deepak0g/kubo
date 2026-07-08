# Kubo Risk Scoring Engine - Setup Instructions

## ✅ System is Ready!

The complete transaction risk scoring system has been built with:
- **8 risk signals** for fraud detection
- **191 test transactions** with 12 chargebacks seeded
- **Prisma + SQLite** database (no native compilation needed!)
- **Docker** deployment ready
- **Full API documentation**

---

## 🚀 Quick Start (3 options)

### Option 1: Docker (Recommended)

```bash
# Start everything with one command
docker-compose up --build

# API will be available at http://localhost:3000
```

### Option 2: Local with npm/pnpm

```bash
# Install dependencies
pnpm install
# or
npm install

# Generate Prisma client
npx prisma generate

# Start server (database already seeded!)
npx tsx src/index.ts

# API available at http://localhost:3000
```

### Option 3: Manual Build

```bash
# Install
pnpm install

# Build TypeScript
npm run build

# Start production
npm start
```

---

## ✅ What's Already Done

**Database:** 
- ✅ SQLite database created at `prisma/data/kubo.db`
- ✅ 191 transactions seeded with fraud patterns
- ✅ Device reputation data built

**Code:**
- ✅ All 8 risk signals implemented
- ✅ API routes with validation
- ✅ Batch analysis script
- ✅ Demo script
- ✅ Watchlist management

---

## 🧪 Test the API

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Score a High-Risk Transaction
```bash
curl -X POST http://localhost:3000/api/v1/risk/score \
  -H "Content-Type: application/json" \
  -d @examples/high-risk-transaction.json
```

### Score a Legitimate Transaction
```bash
curl -X POST http://localhost:3000/api/v1/risk/score \
  -H "Content-Type: application/json" \
  -d @examples/legitimate-transaction.json
```

### Run Demo (all scenarios)
```bash
npm run demo
```

### Batch Analysis
```bash
npm run batch-analysis
```

---

## 📊 Expected Results

### High-Risk Transaction Response:
```json
{
  "success": true,
  "data": {
    "transaction_id": "...",
    "overall_score": 78,
    "risk_level": "HIGH",
    "recommended_action": "DECLINE",
    "contributing_signals": [
      {
        "name": "geographic_anomaly",
        "score": 15,
        "reason": "IP country (RU) differs from card issuing country (US)"
      },
      {
        "name": "email_risk",
        "score": 10,
        "reason": "Disposable email provider detected (tempmail.com)"
      },
      {
        "name": "account_age",
        "score": 15,
        "reason": "Account created less than 24 hours ago"
      }
    ]
  }
}
```

### Batch Analysis Output:
```
📊 Risk Score Distribution:
   LOW (0-30):    142 transactions (74.3%)
   MEDIUM (31-70): 37 transactions (19.4%)
   HIGH (71-100):  12 transactions (6.3%)

🎯 Fraud Detection Performance:
   Total chargebacks: 12
   Chargebacks flagged HIGH: 10 (83.3%)
   Precision: 83.3%
   Recall: 83.3%
```

---

## 📁 Project Structure

```
kubo/
├── src/
│   ├── api/routes.ts              # Express API
│   ├── database/index.ts          # Prisma operations
│   ├── scoring/
│   │   ├── engine.ts              # Risk aggregation
│   │   └── signals/               # 8 signal calculators
│   ├── scripts/
│   │   ├── seedData.ts            # Test data (already run!)
│   │   ├── batchAnalysis.ts       # Historical analysis
│   │   └── demo.ts                # API demo
│   └── types/index.ts             # TypeScript types
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── data/kubo.db               # SQLite database (seeded!)
│
├── examples/                       # Sample JSON payloads
├── output/                         # Analysis reports (generated)
│
├── README.md                       # Full documentation
├── API_DOCS.md                     # API reference
├── QUICK_START.md                  # 5-min guide
└── SOLUTION_SUMMARY.md             # Complete overview
```

---

## 🔧 Troubleshooting

### Port 3000 in use?
```bash
# Change port in .env
PORT=3001

# Or find and kill process
# Windows:
netstat -ano | findstr :3000

# Mac/Linux:
lsof -ti:3000 | xargs kill
```

### Database not found?
```bash
# Database is at: prisma/data/kubo.db
# Already created and seeded!

# To re-seed:
npx tsx src/scripts/seedData.ts
```

### Prisma client issues?
```bash
npx prisma generate
```

---

## 📖 Documentation

1. **[README.md](README.md)** - Complete guide
2. **[API_DOCS.md](API_DOCS.md)** - All endpoints
3. **[QUICK_START.md](QUICK_START.md)** - 5-minute setup
4. **[SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md)** - Full solution overview

---

## 🎯 Key Features Delivered

### Core Requirements ✅
- ✅ Real-time risk scoring (0-100 scale)
- ✅ 8 distinct risk signals
- ✅ Explainable results with signal breakdown
- ✅ Risk classification (LOW/MEDIUM/HIGH)
- ✅ Batch historical analysis
- ✅ Performance metrics

### Stretch Goals ✅
- ✅ Watchlist management (blocklist/allowlist)
- ✅ Configurable thresholds
- ✅ Device reputation tracking
- ✅ Docker deployment

### Test Data ✅
- ✅ 191 transactions seeded
- ✅ 12 chargebacks with fraud patterns
- ✅ All scenarios from Kubo case study
- ✅ 6.28% chargeback rate (matches spike!)

---

## 🚀 Production Checklist

Before deploying:
- [ ] Add API authentication (JWT/API keys)
- [ ] Implement rate limiting
- [ ] Configure monitoring (Datadog/Sentry)
- [ ] Set up database backups
- [ ] Load testing
- [ ] Security audit

---

## 📧 Support

- **API Health:** `GET /api/v1/health`
- **Documentation:** See README.md
- **Examples:** Check `examples/` folder
- **Demo:** Run `npm run demo`

---

**Built for Kubo Market Fraud Detection Challenge** 🛡️

*Technology Stack:* TypeScript, Express, Prisma, SQLite, Zod, Docker
