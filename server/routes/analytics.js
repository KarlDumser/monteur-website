import crypto from 'crypto';
import express from 'express';
import WebsiteVisit from '../models/WebsiteVisit.js';

const router = express.Router();

const HASH_SALT = process.env.ANALYTICS_HASH_SALT || 'change-me-analytics-salt';

const hashValue = (value) =>
  crypto.createHash('sha256').update(`${HASH_SALT}:${value || ''}`).digest('hex');

const parseCsv = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || '';
};

const getReferrerDomain = (referrer) => {
  if (!referrer || typeof referrer !== 'string') {
    return '';
  }

  try {
    return new URL(referrer).hostname || '';
  } catch {
    return '';
  }
};

router.post('/track', async (req, res) => {
  try {
    const visitorId = String(req.body?.visitorId || '').trim();
    const path = String(req.body?.path || '/').trim().slice(0, 160) || '/';
    const referrer = String(req.body?.referrer || '').trim().slice(0, 500);
    const userAgent = String(req.headers['user-agent'] || '').trim().slice(0, 400);

    if (!visitorId) {
      return res.status(400).json({ tracked: false, error: 'visitorId is required' });
    }

    const loweredUserAgent = userAgent.toLowerCase();
    if (/(bot|crawler|spider|headless|lighthouse)/.test(loweredUserAgent)) {
      return res.json({ tracked: false, reason: 'bot-user-agent' });
    }

    const excludedVisitorIds = new Set(parseCsv(process.env.ANALYTICS_EXCLUDED_VISITOR_IDS));
    if (excludedVisitorIds.has(visitorId)) {
      return res.json({ tracked: false, reason: 'excluded-visitor' });
    }

    const ipAddress = getClientIp(req);
    const excludedIps = new Set(parseCsv(process.env.ANALYTICS_EXCLUDED_IPS));
    if (excludedIps.has(ipAddress)) {
      return res.json({ tracked: false, reason: 'excluded-ip' });
    }

    const now = new Date();
    const utcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dateKey = utcDay.toISOString().slice(0, 10);

    const visitorHash = hashValue(visitorId);
    const ipHash = hashValue(ipAddress);
    const userAgentHash = hashValue(userAgent);

    await WebsiteVisit.updateOne(
      { dateKey, visitorHash, path },
      {
        $inc: { views: 1 },
        $set: {
          lastSeen: now,
          referrerDomain: getReferrerDomain(referrer),
          ipHash,
          userAgentHash
        },
        $setOnInsert: {
          dateKey,
          visitDate: utcDay,
          year: utcDay.getUTCFullYear(),
          month: utcDay.getUTCMonth() + 1,
          path,
          visitorHash,
          firstSeen: now
        }
      },
      { upsert: true }
    );

    return res.json({ tracked: true });
  } catch (error) {
    console.error('Analytics tracking error:', error.message);
    return res.status(500).json({ tracked: false, error: 'analytics tracking failed' });
  }
});

export default router;
