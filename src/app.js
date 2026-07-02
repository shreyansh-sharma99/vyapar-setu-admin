'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { decryptRequest, encryptResponse } = require('./middlewares/crypto.middleware');

const app = express();

// Enable trust proxy for express-rate-limit behind reverse proxies (like Render)
app.set('trust proxy', 1);

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Temporarily allowing all origins as requested
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests, please try again later.',
  },
});
app.use(limiter);

// ─── Webhook Route (BEFORE json body parser) ──────────────────────────────────
// Razorpay signature verification requires the raw request body
const webhookRoutes = require('./webhooks/webhook.routes');
app.use(
  '/api/v1/webhooks',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      try {
        req.body = JSON.parse(req.body.toString());
      } catch (_) {
        req.body = {};
      }
    }
    next();
  },
  webhookRoutes
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Cookie Parser ────────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── HTTP Request Logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Crypto Middleware ────────────────────────────────────────────────────────
app.use(decryptRequest);
app.use(encryptResponse);

// ─── Maintenance Guard ────────────────────────────────────────────────────────
app.use(require('./middlewares/maintenanceGuard'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Owner API Routes ────────────────────────────────────────────────────────
// All owner panel routes (auth, team, roles, plans, admins, billing, reports, settings)
const API_PREFIX = process.env.API_PREFIX || '/api/v1';
const ownerRoutes      = require('./owner/index');
const onboardingRoutes = require('./owner/onboarding/onboarding.routes');

app.use(`${API_PREFIX}/owner`, ownerRoutes);
app.use(`${API_PREFIX}/admin`, require('./admin/index'));
app.use(`${API_PREFIX}/storefront`, require('./storefront/index'));
app.use(`${API_PREFIX}/onboarding`, onboardingRoutes);
app.use(`${API_PREFIX}/merchant/tickets`, require('./owner/tickets/merchant.routes'));
app.use(`${API_PREFIX}/upload`, require('./common/upload/upload.routes'));

// ─── Public Broadcast ─────────────────────────────────────────────────────────
app.get(`${API_PREFIX}/public/broadcast`, require('./owner/settings/settings.controller').getPublicBroadcast);


// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Cron Starter (called from server.js after DB connects) ──────────────────
app.startCron = () => {
  try {
    require('./jobs/invoiceCron');
    require('./jobs/reconciliationCron');
    require('./jobs/trialReminderCron');  // pre-expiry reminder emails
    console.log('  Cron jobs started');
  } catch (e) {
    console.warn('[app] Cron start failed:', e.message);
  }
};

module.exports = app;
