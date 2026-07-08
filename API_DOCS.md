# Kubo Risk Scoring Engine - API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

---

## Endpoints

### 1. Health Check

Check API availability and status.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-07-08T12:00:00.000Z",
  "version": "1.0.0"
}
```

**Status Codes:**
- `200 OK` - Service is healthy

---

### 2. Score Transaction

Compute real-time risk score for a transaction.

**Endpoint:** `POST /risk/score`

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | ✅ | Transaction amount (positive number) |
| `currency` | string | ⬜ | Currency code (default: USD) |
| `status` | string | ⬜ | Transaction status: `approved`, `declined`, `chargeback`, `pending` |
| `buyer_id` | string | ✅ | Unique buyer identifier |
| `account_created_at` | string | ✅ | ISO 8601 datetime when account was created |
| `email` | string | ✅ | Buyer email address |
| `email_domain` | string | ✅ | Email domain (e.g., gmail.com) |
| `total_orders` | integer | ✅ | Total number of previous orders |
| `lifetime_spend` | number | ✅ | Total amount spent historically |
| `device_fingerprint` | string | ✅ | Unique device identifier |
| `ip_address` | string | ✅ | IP address of transaction |
| `ip_country` | string | ✅ | 2-letter country code (e.g., US) |
| `user_agent` | string | ✅ | Browser user agent string |
| `card_last4` | string | ✅ | Last 4 digits of card (4 characters) |
| `card_bin` | string | ✅ | Card BIN (first 6 digits) |
| `card_issuing_country` | string | ✅ | 2-letter country code |
| `shipping_address` | string | ✅ | Full shipping address |
| `shipping_city` | string | ✅ | Shipping city |
| `shipping_country` | string | ✅ | 2-letter country code |
| `is_new_address` | boolean | ✅ | Whether this is a new shipping address |
| `billing_country` | string | ✅ | 2-letter country code |

**Example Request:**
```json
{
  "amount": 249.99,
  "currency": "USD",
  "buyer_id": "buyer_12345",
  "account_created_at": "2024-06-01T10:30:00Z",
  "email": "user@example.com",
  "email_domain": "example.com",
  "total_orders": 5,
  "lifetime_spend": 543.20,
  "device_fingerprint": "df_abc123xyz",
  "ip_address": "203.45.67.89",
  "ip_country": "US",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "card_last4": "4532",
  "card_bin": "424242",
  "card_issuing_country": "US",
  "shipping_address": "123 Main St",
  "shipping_city": "San Francisco",
  "shipping_country": "US",
  "is_new_address": false,
  "billing_country": "US"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transaction_id": "generated-uuid",
    "overall_score": 45,
    "risk_level": "MEDIUM",
    "recommended_action": "REVIEW",
    "contributing_signals": [
      {
        "name": "transaction_anomaly",
        "score": 20,
        "max_score": 20,
        "weight": 1.0,
        "reason": "Transaction amount ($249.99) is 2.3x historical average ($108.64)",
        "details": {
          "current_amount": 249.99,
          "historical_average": 108.64,
          "ratio": 2.3,
          "total_orders": 5
        }
      },
      {
        "name": "account_age",
        "score": 10,
        "max_score": 15,
        "weight": 0.67,
        "reason": "Account created 37 days ago (less than a month old)",
        "details": {
          "account_age_hours": 888,
          "account_age_days": 37
        }
      }
    ],
    "metadata": {
      "timestamp": "2024-07-08T12:34:56.789Z",
      "model_version": "1.0.0",
      "processing_time_ms": 45
    }
  }
}
```

**Risk Levels:**
- `LOW` - Score 0-30, Action: APPROVE
- `MEDIUM` - Score 31-70, Action: REVIEW
- `HIGH` - Score 71-100, Action: DECLINE

**Status Codes:**
- `200 OK` - Risk assessment computed successfully
- `400 Bad Request` - Validation error (missing or invalid fields)
- `500 Internal Server Error` - Server error

**Error Response:**
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["buyer_id"],
      "message": "Required"
    }
  ]
}
```

---

### 3. Get Watchlist

Retrieve all watchlist entries (blocklist and allowlist).

**Endpoint:** `GET /watchlist`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "wl_abc123",
      "entity_type": "email",
      "entity_value": "fraudster@example.com",
      "list_type": "blocklist",
      "reason": "Multiple chargebacks",
      "added_at": "2024-07-01T10:00:00Z",
      "added_by": "fraud_team"
    }
  ],
  "count": 1
}
```

**Status Codes:**
- `200 OK` - Watchlist retrieved
- `500 Internal Server Error` - Server error

---

### 4. Add to Watchlist

Add an entity to the blocklist or allowlist.

**Endpoint:** `POST /watchlist`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `entity_type` | string | ✅ | One of: `email`, `device_fingerprint`, `shipping_address`, `ip_address` |
| `entity_value` | string | ✅ | The value to watchlist |
| `list_type` | string | ✅ | Either `blocklist` or `allowlist` |
| `reason` | string | ✅ | Reason for adding to list |
| `added_by` | string | ⬜ | Who added this entry (default: "api") |

**Example Request:**
```json
{
  "entity_type": "device_fingerprint",
  "entity_value": "device_fraud_999",
  "list_type": "blocklist",
  "reason": "Device associated with 5+ chargebacks",
  "added_by": "fraud_analyst"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wl_xyz789",
    "entity_type": "device_fingerprint",
    "entity_value": "device_fraud_999",
    "list_type": "blocklist",
    "reason": "Device associated with 5+ chargebacks",
    "added_at": "2024-07-08T12:00:00Z",
    "added_by": "fraud_analyst"
  }
}
```

**Impact on Risk Scoring:**
- **Blocklist:** Adds +50 points to risk score
- **Allowlist:** Reduces score by -20 points (makes transaction safer)

**Status Codes:**
- `201 Created` - Entry added successfully
- `400 Bad Request` - Validation error
- `500 Internal Server Error` - Server error

---

### 5. Remove from Watchlist

Remove an entry from the watchlist.

**Endpoint:** `DELETE /watchlist/:id`

**URL Parameters:**
- `id` - The watchlist entry ID

**Response:**
```json
{
  "success": true,
  "message": "Entry removed from watchlist"
}
```

**Status Codes:**
- `200 OK` - Entry removed
- `500 Internal Server Error` - Server error

---

## Risk Signals Explained

### 1. Account Age (Max: 15 points)
- New accounts are high-risk
- Score: 15 pts if <24hrs, 10 pts if <7 days, 5 pts if <30 days

### 2. Transaction Anomaly (Max: 20 points)
- Detects unusual purchase amounts
- Score: 20 pts if >3x average, 15 pts for first purchase >$200

### 3. Device Reputation (Max: 35 points)
- Tracks device history across transactions
- Score: 35 pts if device has chargebacks, 15 pts if shared across 5+ buyers

### 4. Velocity (Max: 25 points)
- Detects rapid-fire transactions
- Score: 25 pts for 10+ txns in 2hrs, 20 pts for 6-10 txns, 10 pts for 3-5 txns

### 5. Geographic Anomaly (Max: 15 points)
- Checks IP vs card/shipping country
- Score: 15 pts for IP ≠ card country, 8 pts for high-risk country

### 6. Email Risk (Max: 10 points)
- Evaluates email trustworthiness
- Score: 10 pts for disposable email, 5 pts for suspicious pattern

### 7. Shipping Risk (Max: 15 points)
- Analyzes shipping address patterns
- Score: 15 pts for multiple buyers to same address, 5 pts for new address

### 8. Purchase Pattern (Max: 10 points)
- Detects suspicious patterns
- Score: 8 pts for amount just under threshold ($140-149)

### 9. Watchlist (Max: 50 points, if enabled)
- Checks against known entities
- Score: 50 pts for blocklist, -20 pts for allowlist

---

## Example cURL Commands

### Score a transaction
```bash
curl -X POST http://localhost:3000/api/v1/risk/score \
  -H "Content-Type: application/json" \
  -d @examples/legitimate-transaction.json
```

### Add to blocklist
```bash
curl -X POST http://localhost:3000/api/v1/watchlist \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "email",
    "entity_value": "bad@example.com",
    "list_type": "blocklist",
    "reason": "Known fraudster"
  }'
```

### Get all watchlist entries
```bash
curl http://localhost:3000/api/v1/watchlist
```

### Remove from watchlist
```bash
curl -X DELETE http://localhost:3000/api/v1/watchlist/wl_abc123
```

---

## Rate Limiting

Currently not implemented. In production, consider:
- 100 requests per minute per IP
- 1000 requests per hour per API key

## Authentication

Currently not implemented. In production, use:
- API keys in `Authorization: Bearer <token>` header
- JWT tokens for service-to-service communication

## Webhooks

Not implemented. Future enhancement:
- POST to configured URL when HIGH-risk transaction detected
- Payload includes full risk assessment

---

## Support

For issues or questions:
- Check `/api/v1/health` for service status
- Review logs in Docker container: `docker-compose logs -f`
- See README.md for setup instructions
