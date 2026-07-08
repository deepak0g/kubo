import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { calculateRiskScore } from '../scoring/engine';
import { insertTransaction, getAllWatchlistEntries, addToWatchlist, removeFromWatchlist } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Validation schema for transaction
const TransactionSchema = z.object({
  transaction_id: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  status: z.enum(['approved', 'declined', 'chargeback', 'pending']).default('pending'),

  buyer_id: z.string(),
  account_created_at: z.string().datetime(),
  email: z.string().email(),
  email_domain: z.string(),
  total_orders: z.number().int().min(0),
  lifetime_spend: z.number().min(0),

  device_fingerprint: z.string(),
  ip_address: z.string(),
  ip_country: z.string().length(2),
  user_agent: z.string(),

  card_last4: z.string().length(4),
  card_bin: z.string().length(6),
  card_issuing_country: z.string().length(2),

  shipping_address: z.string(),
  shipping_city: z.string(),
  shipping_country: z.string().length(2),
  is_new_address: z.boolean(),

  billing_country: z.string().length(2)
});

/**
 * POST /api/v1/risk/score
 *
 * Compute real-time risk score for a transaction
 */
router.post('/risk/score', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = TransactionSchema.parse(req.body);

    // Add defaults
    const transaction = {
      ...validatedData,
      transaction_id: validatedData.transaction_id || uuidv4(),
      timestamp: validatedData.timestamp || new Date().toISOString()
    };

    // Store transaction in database
    await insertTransaction(transaction);

    // Calculate risk score
    const riskAssessment = await calculateRiskScore(transaction);

    res.json({
      success: true,
      data: riskAssessment
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Error processing risk score:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * GET /api/v1/health
 *
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Watchlist endpoints (Stretch Goal)
 */

const WatchlistEntrySchema = z.object({
  entity_type: z.enum(['email', 'device_fingerprint', 'shipping_address', 'ip_address']),
  entity_value: z.string(),
  list_type: z.enum(['blocklist', 'allowlist']),
  reason: z.string(),
  added_by: z.string().default('api')
});

/**
 * GET /api/v1/watchlist
 *
 * Get all watchlist entries
 */
router.get('/watchlist', async (req: Request, res: Response) => {
  try {
    const entries = await getAllWatchlistEntries();
    res.json({
      success: true,
      data: entries,
      count: entries.length
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/v1/watchlist
 *
 * Add entry to watchlist
 */
router.post('/watchlist', (req: Request, res: Response) => {
  try {
    const validatedData = WatchlistEntrySchema.parse(req.body);

    const entry = {
      id: uuidv4(),
      ...validatedData,
      added_at: new Date().toISOString()
    };

    addToWatchlist(entry);

    res.status(201).json({
      success: true,
      data: entry
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    } else {
      console.error('Error adding to watchlist:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
});

/**
 * DELETE /api/v1/watchlist/:id
 *
 * Remove entry from watchlist
 */
router.delete('/watchlist/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    removeFromWatchlist(id);

    res.json({
      success: true,
      message: 'Entry removed from watchlist'
    });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
