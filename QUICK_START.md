# Quick Start Guide

Get the Kubo Risk Scoring Engine up and running in 5 minutes.

## Prerequisites

- Docker and Docker Compose installed (recommended)
- OR Node.js 20+ and npm (for local development)

---

## Option 1: Docker (Recommended) ⚡

### Step 1: Start the API
```bash
docker-compose up --build
```

Wait for the message:
```
╔═══════════════════════════════════════════════╗
║   Kubo Risk Scoring Engine                    ║
║   Server running on port 3000                 ║
╚═══════════════════════════════════════════════╝
```

### Step 2: Seed Test Data (in a new terminal)
```bash
# Install dependencies locally (one-time)
npm install

# Generate realistic test data
npm run seed
```

Output:
```
✅ Database seeded successfully!

📊 Statistics:
   Total transactions: 200+
   Approved: 180+
   Chargebacks: 12+
   Chargeback rate: ~6%
```

### Step 3: Test the API
```bash
npm run demo
```

You'll see 4 test scenarios:
- ✅ Legitimate transaction → LOW risk
- ⚠️ New account + high value → MEDIUM/HIGH risk
- 🚨 Geographic mismatch → HIGH risk
- ⚠️ Threshold testing → MEDIUM risk

### Step 4: Run Batch Analysis
```bash
npm run batch-analysis
```

This generates:
- Risk score distribution
- Fraud detection metrics
- Top contributing signals
- Recommended threshold

Output saved to `./output/` folder.

---

## Option 2: Local Development 🛠️

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Seed Database
```bash
npm run seed
```

### Step 3: Start Development Server
```bash
npm run dev
```

API available at: `http://localhost:3000`

### Step 4: Test It
```bash
# In another terminal
npm run demo
```

---

## Testing the API Manually

### Using cURL

**Score a legitimate transaction:**
```bash
curl -X POST http://localhost:3000/api/v1/risk/score \
  -H "Content-Type: application/json" \
  -d @examples/legitimate-transaction.json
```

**Score a high-risk transaction:**
```bash
curl -X POST http://localhost:3000/api/v1/risk/score \
  -H "Content-Type: application/json" \
  -d @examples/high-risk-transaction.json
```

**Health check:**
```bash
curl http://localhost:3000/api/v1/health
```

### Using Postman

1. Import the example JSON files from `examples/` folder
2. POST to `http://localhost:3000/api/v1/risk/score`
3. Set `Content-Type: application/json` header
4. Send request

---

## Understanding the Response

Example response for a risky transaction:

```json
{
  "success": true,
  "data": {
    "transaction_id": "txn_abc123",
    "overall_score": 78,           // 0-100 scale
    "risk_level": "HIGH",           // LOW / MEDIUM / HIGH
    "recommended_action": "DECLINE", // APPROVE / REVIEW / DECLINE
    "contributing_signals": [
      {
        "name": "device_reputation",
        "score": 35,
        "max_score": 35,
        "reason": "Device has 3 previous chargeback(s)"
      },
      {
        "name": "account_age",
        "score": 15,
        "reason": "Account created less than 24 hours ago"
      }
    ],
    "metadata": {
      "timestamp": "2024-07-08T12:34:56Z",
      "model_version": "1.0.0",
      "processing_time_ms": 45
    }
  }
}
```

**Key fields:**
- `overall_score`: 0-100 (higher = riskier)
- `risk_level`: LOW (0-30), MEDIUM (31-70), HIGH (71-100)
- `recommended_action`: What to do with this transaction
- `contributing_signals`: Why this score was assigned

---

## Next Steps

### 1. Explore Batch Analysis
```bash
npm run batch-analysis
```

Check `./output/` folder for:
- `batch-analysis-{id}.json` - Full analysis report
- `high-risk-transactions-{id}.csv` - High-risk transactions list

### 2. Try Watchlist Features

**Add to blocklist:**
```bash
curl -X POST http://localhost:3000/api/v1/watchlist \
  -H "Content-Type: application/json" \
  -d @examples/watchlist-blocklist.json
```

**View watchlist:**
```bash
curl http://localhost:3000/api/v1/watchlist
```

### 3. Customize Thresholds

Edit `.env` file:
```bash
RISK_THRESHOLD_LOW=25      # Below this: APPROVE
RISK_THRESHOLD_MEDIUM=75   # Below this: REVIEW, above: DECLINE
```

Restart the API to apply changes.

### 4. Read Full Documentation

- [README.md](README.md) - Complete overview
- [API_DOCS.md](API_DOCS.md) - Detailed API reference

---

## Common Issues

### Port 3000 already in use
```bash
# Change port in .env file
PORT=3001

# Or stop the conflicting process
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -ti:3000 | xargs kill
```

### Docker build fails
```bash
# Clean Docker cache
docker-compose down -v
docker system prune -af
docker-compose up --build
```

### Database locked error
```bash
# Stop all processes using the database
# Remove the database file
rm -rf data/kubo.db

# Re-seed
npm run seed
```

---

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper database path
- [ ] Add API authentication
- [ ] Implement rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure proper CORS origins
- [ ] Use environment secrets management
- [ ] Set up database backups
- [ ] Configure SSL/TLS
- [ ] Add health check monitoring

---

## Getting Help

- Check API health: `curl http://localhost:3000/api/v1/health`
- View logs: `docker-compose logs -f`
- GitHub Issues: [Report a bug or request a feature]
- Documentation: See README.md and API_DOCS.md

---

**You're all set! 🚀**

The Kubo Risk Scoring Engine is now protecting Kubo Market from fraud.
