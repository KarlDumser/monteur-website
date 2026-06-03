import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import OpenAI from 'openai';
import Booking from '../models/Booking.js';

const DEFAULT_WOHNUNG = 'hackerberg';
const DEFAULT_WOHNUNG_LABEL = 'Wohnung (Mailimport - bitte pruefen)';

let workerStarted = false;
let importInProgress = false;

function isEmailImportEnabled() {
  return String(process.env.EMAIL_IMPORT_ENABLED || 'false').toLowerCase() === 'true';
}

function parseDateInput(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const german = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (german) {
    const date = new Date(Number(german[3]), Number(german[2]) - 1, Number(german[1]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function extractWithRegex(text) {
  const input = String(text || '');

  const emailMatch = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = input.match(/(\+?[0-9][0-9\s\-/()]{6,})/);

  const dateMatches = [...input.matchAll(/(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  const startDate = parseDateInput(dateMatches[0]);
  const endDate = parseDateInput(dateMatches[1]);

  const peopleMatch = input.match(/(\d{1,2})\s*(Personen|Person|Gaeste|Gaste|Pax)/i);
  const nightsMatch = input.match(/(\d{1,3})\s*(Naechte|Nachte|Nacht)/i);

  return {
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0].trim() : '',
    startDate: startDate ? startDate.toISOString().slice(0, 10) : '',
    endDate: endDate ? endDate.toISOString().slice(0, 10) : '',
    people: peopleMatch ? Number(peopleMatch[1]) : null,
    nights: nightsMatch ? Number(nightsMatch[1]) : null,
    notes: input.slice(0, 2000)
  };
}

function inferWohnung(text) {
  const raw = String(text || '').toLowerCase();
  if (raw.includes('neubau') || raw.includes('fruehling') || raw.includes('fruhling') || raw.includes('fruhlig')) {
    return { wohnung: 'neubau', wohnungLabel: 'Wohnung Fruehlingstrasse' };
  }
  if (raw.includes('kombi') || raw.includes('beide')) {
    return { wohnung: 'kombi', wohnungLabel: 'Kombi (beide Wohnungen)' };
  }
  if (raw.includes('hackerberg') || raw.includes('penthouse')) {
    return { wohnung: 'hackerberg', wohnungLabel: 'Wohnung Hackerberg' };
  }
  return { wohnung: DEFAULT_WOHNUNG, wohnungLabel: DEFAULT_WOHNUNG_LABEL };
}

function detectProvider(fromAddress, subject) {
  const source = `${String(fromAddress || '').toLowerCase()} ${String(subject || '').toLowerCase()}`;
  if (source.includes('booking.com')) return 'booking.com';
  if (source.includes('airbnb')) return 'airbnb';
  if (source.includes('monteurzimmer')) return 'monteurzimmer.de';
  if (source.includes('fewo') || source.includes('ferienwohnung')) return 'fewo';
  return 'email-import';
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function extractWithAI(text, subject) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const client = new OpenAI({ apiKey });

  const prompt = [
    'Extract booking inquiry data from this email text.',
    'Return JSON only with keys:',
    'name,email,phone,company,street,zip,city,country,wohnung,startDate,endDate,nights,people,total,notes,confidence',
    'Dates must be in YYYY-MM-DD when available.',
    'wohnung must be one of: neubau,hackerberg,kombi when confidently known.'
  ].join('\n');

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: `Subject: ${String(subject || '')}\n\n${String(text || '').slice(0, 12000)}` }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function buildInquiryPayload(parsed, emailMeta) {
  const combinedText = `${emailMeta.subject || ''}\n${emailMeta.text || ''}`;
  const wohnungInfo = inferWohnung(parsed.wohnung || combinedText);

  const startDate = parseDateInput(parsed.startDate) || new Date();
  let endDate = parseDateInput(parsed.endDate);
  if (!endDate || endDate <= startDate) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.max(1, safeNumber(parsed.nights, 1)));
  }

  const nightsFromDates = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  const nights = safeNumber(parsed.nights, nightsFromDates) || nightsFromDates;
  const people = Math.max(1, safeNumber(parsed.people, 1));
  const total = Math.max(0, safeNumber(parsed.total, 0));
  const subtotal = total;
  const vat = 0;
  const discount = 0;
  const pricePerNight = nights > 0 ? Math.round((subtotal / nights) * 100) / 100 : subtotal;

  const previewText = String(emailMeta.text || '').replace(/\s+/g, ' ').trim().slice(0, 1000);

  return {
    name: String(parsed.name || '').trim() || 'Unbekannt (Mailimport)',
    email: String(parsed.email || '').trim() || String(emailMeta.fromAddress || '').trim() || 'mailimport@invalid.local',
    phone: String(parsed.phone || '').trim() || 'unbekannt',
    company: String(parsed.company || '').trim() || 'Unbekannt',
    street: String(parsed.street || '').trim() || 'Unbekannt',
    zip: String(parsed.zip || '').trim() || '00000',
    city: String(parsed.city || '').trim() || 'Unbekannt',
    country: String(parsed.country || '').trim() || 'DE',
    countryLabel: 'Deutschland',
    wohnung: wohnungInfo.wohnung,
    wohnungLabel: wohnungInfo.wohnungLabel,
    startDate,
    endDate,
    nights,
    people,
    pricePerNight,
    cleaningFee: 0,
    subtotal,
    discount,
    vat,
    total,
    paymentMethod: 'invoice',
    paymentStatus: 'pending',
    isInquiry: true,
    inquiryStatus: 'pending',
    inquirySource: 'email',
    inquiryProvider: detectProvider(emailMeta.fromAddress, emailMeta.subject),
    adminNote: parsed.notes ? String(parsed.notes).slice(0, 2000) : null,
    emailImport: {
      messageId: emailMeta.messageId || null,
      fromAddress: emailMeta.fromAddress || '',
      subject: emailMeta.subject || '',
      importedAt: new Date(),
      rawTextPreview: previewText
    }
  };
}

function getImapConfig() {
  return {
    host: process.env.IMAP_HOST || process.env.EMAIL_IMAP_HOST || '',
    port: Number(process.env.IMAP_PORT || process.env.EMAIL_IMAP_PORT || 993),
    secure: String(process.env.IMAP_SECURE || process.env.EMAIL_IMAP_SECURE || 'true').toLowerCase() !== 'false',
    user: process.env.IMAP_USER || process.env.EMAIL_IMAP_USER || '',
    pass: process.env.IMAP_PASSWORD || process.env.EMAIL_IMAP_PASSWORD || ''
  };
}

function hasImapConfig(config = getImapConfig()) {
  return Boolean(config.host && config.user && config.pass);
}

async function fetchParsedMessage(client, uid) {
  const message = await client.fetchOne(uid, {
    envelope: true,
    source: true,
    flags: true,
    internalDate: true
  });

  if (!message?.source) {
    return null;
  }

  const parsedMail = await simpleParser(message.source);
  const text = String(parsedMail.text || parsedMail.html || '').trim();
  const fromAddress = parsedMail.from?.value?.[0]?.address || '';
  const subject = parsedMail.subject || message.envelope?.subject || '';
  const messageId = parsedMail.messageId || message.envelope?.messageId || null;

  return {
    uid,
    text,
    fromAddress,
    subject,
    messageId,
    seen: Array.isArray(message.flags) ? message.flags.includes('\\Seen') : false,
    date: parsedMail.date || message.internalDate || message.envelope?.date || null
  };
}

async function importMessageFromParsedMail(client, parsedMessage, { markSeen = true } = {}) {
  const { uid, text, fromAddress, subject, messageId } = parsedMessage;

  if (messageId) {
    const duplicate = await Booking.findOne({ 'emailImport.messageId': messageId }).select('_id');
    if (duplicate) {
      if (markSeen) {
        await client.messageFlagsAdd(uid, ['\\Seen']);
      }

      return {
        status: 'skipped',
        reason: 'duplicate-message-id',
        uid,
        messageId,
        inquiryId: String(duplicate._id)
      };
    }
  }

  const aiParsed = await extractWithAI(text, subject);
  const regexParsed = extractWithRegex(text);
  const merged = {
    ...regexParsed,
    ...(aiParsed || {})
  };

  const payload = buildInquiryPayload(merged, {
    messageId,
    fromAddress,
    subject,
    text
  });

  const booking = new Booking(payload);
  await booking.save();

  if (markSeen) {
    await client.messageFlagsAdd(uid, ['\\Seen']);
  }

  return {
    status: 'created',
    uid,
    messageId,
    inquiryId: String(booking._id)
  };
}

export async function listInquiryEmailCandidates({ seen = true, limit = 25 } = {}) {
  const config = getImapConfig();
  if (!hasImapConfig(config)) {
    return { status: 'skipped', reason: 'imap-config-missing', emails: [] };
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const searchCriteria = typeof seen === 'boolean' ? { seen } : {};
      const uids = await client.search(searchCriteria);
      const limitedUids = uids.slice(-Math.max(1, Math.min(100, Number(limit) || 25))).reverse();
      const emails = [];

      for (const uid of limitedUids) {
        try {
          const parsedMessage = await fetchParsedMessage(client, uid);
          if (!parsedMessage) continue;

          let existingInquiryId = null;
          if (parsedMessage.messageId) {
            const existing = await Booking.findOne({ 'emailImport.messageId': parsedMessage.messageId }).select('_id');
            existingInquiryId = existing ? String(existing._id) : null;
          }

          emails.push({
            uid,
            messageId: parsedMessage.messageId,
            fromAddress: parsedMessage.fromAddress,
            subject: parsedMessage.subject,
            date: parsedMessage.date,
            seen: parsedMessage.seen,
            alreadyImported: Boolean(existingInquiryId),
            existingInquiryId,
            preview: parsedMessage.text.replace(/\s+/g, ' ').trim().slice(0, 240)
          });
        } catch (err) {
          emails.push({
            uid,
            fromAddress: '',
            subject: 'Mail konnte nicht gelesen werden',
            date: null,
            seen: Boolean(seen),
            alreadyImported: false,
            existingInquiryId: null,
            preview: err.message
          });
        }
      }

      return { status: 'ok', emails };
    } finally {
      lock.release();
    }
  } finally {
    if (client.usable) {
      try {
        await client.logout();
      } catch {
        // noop
      }
    }
  }
}

export async function getInquiryEmailDiagnostics() {
  const config = getImapConfig();
  const enabled = isEmailImportEnabled();
  const hasConfig = hasImapConfig(config);

  const diagnostics = {
    status: hasConfig ? 'pending' : 'skipped',
    enabled,
    imap: {
      hostConfigured: Boolean(config.host),
      port: config.port,
      secure: config.secure,
      userConfigured: Boolean(config.user),
      passwordConfigured: Boolean(config.pass),
      mailbox: 'INBOX'
    },
    openai: {
      configured: Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    },
    inbox: {
      seenCount: 0,
      unseenCount: 0
    },
    connection: {
      ok: false,
      message: hasConfig ? 'Noch nicht getestet' : 'IMAP-Konfiguration fehlt'
    }
  };

  if (!hasConfig) {
    return diagnostics;
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const seenUids = await client.search({ seen: true });
      const unseenUids = await client.search({ seen: false });
      diagnostics.inbox.seenCount = seenUids.length;
      diagnostics.inbox.unseenCount = unseenUids.length;
      diagnostics.connection.ok = true;
      diagnostics.connection.message = 'IMAP-Verbindung erfolgreich';
      diagnostics.status = 'ok';
    } finally {
      lock.release();
    }
  } catch (err) {
    diagnostics.status = 'error';
    diagnostics.connection.ok = false;
    diagnostics.connection.message = err.message;
  } finally {
    if (client.usable) {
      try {
        await client.logout();
      } catch {
        // noop
      }
    }
  }

  return diagnostics;
}

export async function importInquiryEmailsByUid(uids, { markSeen = true } = {}) {
  if (importInProgress) {
    return { status: 'skipped', reason: 'import-already-running', results: [] };
  }

  const config = getImapConfig();
  if (!hasImapConfig(config)) {
    return { status: 'skipped', reason: 'imap-config-missing', results: [] };
  }

  const uniqueUids = [...new Set((Array.isArray(uids) ? uids : []).map((uid) => Number(uid)).filter((uid) => Number.isInteger(uid) && uid > 0))];
  if (uniqueUids.length === 0) {
    return { status: 'skipped', reason: 'no-uids-provided', results: [] };
  }

  importInProgress = true;

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  const stats = {
    status: 'ok',
    scanned: uniqueUids.length,
    created: 0,
    skipped: 0,
    errors: 0,
    results: []
  };

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      for (const uid of uniqueUids) {
        try {
          const parsedMessage = await fetchParsedMessage(client, uid);
          if (!parsedMessage) {
            stats.skipped += 1;
            stats.results.push({ status: 'skipped', reason: 'message-without-source', uid });
            continue;
          }

          const result = await importMessageFromParsedMail(client, parsedMessage, { markSeen });
          if (result.status === 'created') stats.created += 1;
          else stats.skipped += 1;
          stats.results.push(result);
        } catch (err) {
          stats.errors += 1;
          stats.results.push({ status: 'error', uid, error: err.message });
          console.error('Manual email inquiry import failed for one message:', err.message);
        }
      }
    } finally {
      lock.release();
    }

    return stats;
  } catch (err) {
    console.error('Manual email inquiry import failed:', err.message);
    return { ...stats, status: 'error', error: err.message };
  } finally {
    importInProgress = false;
    if (client.usable) {
      try {
        await client.logout();
      } catch {
        // noop
      }
    }
  }
}

export async function runInquiryEmailImportOnce() {
  if (importInProgress) {
    return { status: 'skipped', reason: 'import-already-running' };
  }

  const enabled = isEmailImportEnabled();
  if (!enabled) {
    return { status: 'skipped', reason: 'email-import-disabled' };
  }

  const config = getImapConfig();
  if (!hasImapConfig(config)) {
    return { status: 'skipped', reason: 'imap-config-missing' };
  }

  const maxPerRun = Math.max(1, Number(process.env.EMAIL_IMPORT_MAX_PER_RUN || 10));
  const markSeen = String(process.env.EMAIL_IMPORT_MARK_SEEN || 'true').toLowerCase() !== 'false';

  importInProgress = true;

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });

  const stats = { status: 'ok', scanned: 0, created: 0, skipped: 0, errors: 0 };

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const unseen = await client.search({ seen: false });
      const uids = unseen.slice(0, maxPerRun);
      stats.scanned = uids.length;

      for (const uid of uids) {
        try {
          const parsedMessage = await fetchParsedMessage(client, uid);
          if (!parsedMessage) {
            stats.skipped += 1;
            continue;
          }

          const result = await importMessageFromParsedMail(client, parsedMessage, { markSeen });
          if (result.status === 'created') stats.created += 1;
          else stats.skipped += 1;
        } catch (err) {
          stats.errors += 1;
          console.error('Email inquiry import failed for one message:', err.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return stats;
  } catch (err) {
    console.error('Email inquiry import failed:', err.message);
    return { status: 'error', error: err.message, ...stats };
  } finally {
    importInProgress = false;
    if (client.usable) {
      try {
        await client.logout();
      } catch {
        // noop
      }
    }
  }
}

export function startInquiryEmailImportWorker() {
  if (workerStarted) return;
  workerStarted = true;

  const enabled = isEmailImportEnabled();
  if (!enabled) {
    console.log('Email inquiry import worker disabled');
    return;
  }

  const intervalMs = Math.max(60_000, Number(process.env.EMAIL_IMPORT_INTERVAL_MS || 300_000));

  const runSafely = async () => {
    const result = await runInquiryEmailImportOnce();
    if (result.status !== 'skipped') {
      console.log('Email inquiry import run:', result);
    }
  };

  setTimeout(() => {
    runSafely().catch((err) => console.error('Initial email import run failed:', err.message));
  }, 7000);

  setInterval(() => {
    runSafely().catch((err) => console.error('Scheduled email import run failed:', err.message));
  }, intervalMs);

  console.log(`Email inquiry import worker started (interval ${intervalMs} ms)`);
}
