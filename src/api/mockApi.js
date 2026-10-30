import { sendSms } from '../services/twilioMock.js';
import { envNumber } from '../utils/env.js';
import { sanitizeText } from '../utils/sanitize.js';
import { normalizePhone, validateSettingsForm, validateWaitlistForm } from '../utils/validation.js';

/**
 * Mock REST API backed by localStorage. Every call simulates network latency
 * and random failures so the UI's loading / error / retry paths are exercised.
 * Contracts are documented in docs/ARCHITECTURE.md.
 */
const config = {
  latencyMin: envNumber('VITE_MOCK_API_LATENCY_MIN', 600),
  latencyMax: envNumber('VITE_MOCK_API_LATENCY_MAX', 1200),
  failureRate: envNumber('VITE_MOCK_API_FAILURE_RATE', 0.1),
};

export function configureMockApi(partial) {
  Object.assign(config, partial);
}

export class ApiError extends Error {
  constructor(code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
  }
}

const KEYS = ['sessions', 'members', 'waitlist', 'notifications', 'settings'];
const DEFAULT_SETTINGS = { confirmationWindowMinutes: 15, maxRetries: 3 };
const MINUTE = 60000;

const iso = (ms = Date.now()) => new Date(ms).toISOString();
const makeId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function isToday(isoString) {
  if (!isoString) return false;
  const date = new Date(isoString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/* ---------- storage ---------- */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new ApiError('STORAGE_ERROR', 'Could not save data. Browser storage may be full or disabled.');
  }
}

const MEMBER_NAMES = [
  'Aarav Sharma', 'Priya Nair', 'Rohan Mehta', 'Ananya Iyer', 'Vikram Singh', 'Neha Kapoor',
  'Arjun Reddy', 'Kavya Menon', 'Siddharth Rao', 'Isha Verma', 'Rahul Desai', 'Meera Joshi',
  'Karan Malhotra', 'Sneha Patil', 'Aditya Kulkarni', 'Pooja Bansal', 'Nikhil Gupta', 'Divya Chatterjee',
];
const CLASSES = [
  ['Morning Yoga Flow', 12], ['HIIT Burn', 15], ['Power Pilates', 10],
  ['Spin Cycle', 20], ['Zumba Dance', 25], ['Strength Foundations', 12],
];
// [sessionId, member number, status, minutes ago the member joined]
const WAITLIST_PLAN = [
  ['session-1', 1, 'notified', 95], ['session-1', 2, 'waiting', 80], ['session-1', 3, 'waiting', 70],
  ['session-1', 4, 'waiting', 55], ['session-2', 5, 'waiting', 120], ['session-2', 6, 'waiting', 90],
  ['session-2', 7, 'waiting', 40], ['session-3', 8, 'waiting', 60], ['session-3', 9, 'waiting', 35],
  ['session-4', 10, 'waiting', 30], ['session-4', 11, 'cancelled', 50],
];

function buildBody(session, settings) {
  return `Good news! A spot opened in ${session.className}. Please confirm with the front desk within ${settings.confirmationWindowMinutes} minutes.`;
}

function recalc(waitlist, sessionId) {
  const inSession = waitlist.filter((entry) => entry.sessionId === sessionId);
  inSession
    .filter((entry) => entry.status === 'waiting')
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt) || a.id.localeCompare(b.id))
    .forEach((entry, index) => {
      entry.position = index + 1;
    });
  inSession.filter((entry) => entry.status !== 'waiting').forEach((entry) => {
    entry.position = null;
  });
}

function seed() {
  const t = Date.now();
  const sessions = CLASSES.map(([className, totalSeats], i) => ({
    id: `session-${i + 1}`,
    className,
    startTime: iso(t + (i + 1) * 90 * MINUTE),
    endTime: iso(t + (i + 1) * 90 * MINUTE + 60 * MINUTE),
    totalSeats,
    seatsTaken: i < 4 ? totalSeats : totalSeats - 3,
    createdAt: iso(t),
  }));
  const members = MEMBER_NAMES.map((name, i) => ({
    id: `member-${i + 1}`,
    name,
    phone: `+91${9000000000 + (i + 1) * 7919}`,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    createdAt: iso(t),
  }));
  const waitlist = WAITLIST_PLAN.map(([sessionId, n, status, minutesAgo]) => ({
    id: `wait-seed-${n}`,
    sessionId,
    memberId: members[n - 1].id,
    name: members[n - 1].name,
    phone: members[n - 1].phone,
    email: members[n - 1].email,
    position: null,
    status,
    joinedAt: iso(t - minutesAgo * MINUTE),
    notifiedAt: status === 'notified' ? iso(t - 5 * MINUTE) : null,
    createdAt: iso(t - minutesAgo * MINUTE),
  }));
  ['session-1', 'session-2', 'session-3', 'session-4'].forEach((id) => recalc(waitlist, id));
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const body = (id) => buildBody(sessions.find((s) => s.id === id), DEFAULT_SETTINGS);
  const notifications = [
    {
      id: 'notif-seed-1', waitlistEntryId: 'wait-seed-1', sessionId: 'session-1', memberName: members[0].name,
      phone: members[0].phone, body: body('session-1'), status: 'queued', attempts: 1, twilioSid: 'SMSEED0001',
      errorMessage: null, sentAt: iso(Math.max(t - 5 * MINUTE, startOfToday + 1000)), createdAt: iso(t - 5 * MINUTE),
    },
    {
      id: 'notif-seed-2', waitlistEntryId: 'wait-seed-5', sessionId: 'session-2', memberName: members[4].name,
      phone: members[4].phone, body: body('session-2'), status: 'failed', attempts: 1, twilioSid: null,
      errorMessage: 'Mock Twilio failure', sentAt: iso(t - 20 * MINUTE), createdAt: iso(t - 20 * MINUTE),
    },
  ];
  write('sessions', sessions);
  write('members', members);
  write('waitlist', waitlist);
  write('notifications', notifications);
  write('settings', DEFAULT_SETTINGS);
}

function ensureSeed() {
  try {
    if (localStorage.getItem('sessions') === null) seed();
  } catch {
    /* storage unavailable: reads fall back to empty data, writes raise ApiError */
  }
}

function load() {
  ensureSeed();
  return {
    sessions: read('sessions', []),
    members: read('members', []),
    waitlist: read('waitlist', []),
    notifications: read('notifications', []),
    settings: { ...DEFAULT_SETTINGS, ...read('settings', {}) },
  };
}

function save(state, keys = KEYS) {
  keys.forEach((key) => write(key, state[key]));
}

export function resetMockData() {
  KEYS.forEach((key) => localStorage.removeItem(key));
  seed();
}

/* ---------- network simulation ---------- */

function simulateLatency() {
  const ms = config.latencyMin + Math.random() * (config.latencyMax - config.latencyMin);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function maybeFail() {
  if (Math.random() < config.failureRate) {
    throw new Error('Mock network error: request failed');
  }
}

async function gate() {
  await simulateLatency();
  maybeFail();
  await processExpirations();
}

/* ---------- SMS job ---------- */

async function attemptSms(to, body) {
  try {
    return { response: await sendSms(to, body) };
  } catch (error) {
    return { error };
  }
}

function pickCandidate(state, sessionId, onlyEntryId = null) {
  const candidates = state.waitlist
    .filter((e) => e.sessionId === sessionId && e.status === 'waiting' && (!onlyEntryId || e.id === onlyEntryId))
    .sort((a, b) => a.position - b.position);
  for (const entry of candidates) {
    const failed = state.notifications.find((n) => n.waitlistEntryId === entry.id && n.status === 'failed');
    if (failed && failed.attempts >= state.settings.maxRetries) {
      entry.status = 'expired'; // SMS undeliverable after max attempts: move on
      continue;
    }
    return { entry, failed };
  }
  return null;
}

function applyOutcome(state, entryId, notifId, body, outcome) {
  const entry = state.waitlist.find((e) => e.id === entryId);
  if (!entry) throw new ApiError('NOT_FOUND', 'Waitlist entry no longer exists.');
  if (entry.status !== 'waiting') {
    throw new ApiError('INVALID_STATE', 'This entry changed while the SMS was sending.');
  }
  let notif = notifId ? state.notifications.find((n) => n.id === notifId) : null;
  if (!notif) {
    notif = {
      id: makeId('notif'), waitlistEntryId: entry.id, sessionId: entry.sessionId, memberName: entry.name,
      phone: entry.phone, body, status: 'queued', attempts: 0, twilioSid: null, errorMessage: null,
      sentAt: null, createdAt: iso(),
    };
    state.notifications.push(notif);
  }
  notif.attempts += 1;
  notif.body = body;
  if (outcome.response) {
    Object.assign(notif, {
      status: outcome.response.status, twilioSid: outcome.response.sid,
      errorMessage: null, sentAt: outcome.response.dateCreated,
    });
    entry.status = 'notified';
    entry.notifiedAt = outcome.response.dateCreated;
    recalc(state.waitlist, entry.sessionId);
    return { ok: true, notif, entry };
  }
  Object.assign(notif, { status: 'failed', errorMessage: outcome.error.message, sentAt: iso() });
  return { ok: false, notif, entry };
}

/** Sends an SMS to the next waiting member (or a specific entry). Returns null when nobody is waiting. */
async function dispatch(sessionId, entryId = null) {
  const state = load();
  const session = state.sessions.find((s) => s.id === sessionId);
  if (!session) throw new ApiError('NOT_FOUND', 'Session not found.');
  if (entryId) {
    const target = state.waitlist.find((e) => e.id === entryId && e.sessionId === sessionId);
    if (!target) throw new ApiError('NOT_FOUND', 'Waitlist entry not found.');
    if (target.status !== 'waiting') throw new ApiError('INVALID_STATE', `${target.name} is already ${target.status}.`);
  }
  const pick = pickCandidate(state, sessionId, entryId);
  recalc(state.waitlist, sessionId);
  save(state, ['waitlist']);
  if (!pick) {
    if (entryId) throw new ApiError('MAX_RETRIES', 'SMS could not be delivered after the maximum number of attempts.');
    return null;
  }
  const body = buildBody(session, state.settings);
  const outcome = await attemptSms(pick.entry.phone, body);
  const fresh = load();
  const result = applyOutcome(fresh, pick.entry.id, pick.failed?.id ?? null, body, outcome);
  save(fresh, ['waitlist', 'notifications']);
  return result;
}

function toResponse({ ok, notif, entry }) {
  if (!ok) {
    throw new ApiError(
      'SMS_FAILED',
      `SMS to ${entry.name} failed (attempt ${notif.attempts}). You can retry it from the Notifications page.`,
    );
  }
  return { notificationId: notif.id, waitlistEntryId: entry.id, memberName: entry.name };
}

/** Notified entries not confirmed within the window expire; the next waiting member is notified. */
async function runExpiry() {
  const state = load();
  const windowMs = state.settings.confirmationWindowMinutes * MINUTE;
  const affected = new Set();
  state.waitlist.forEach((entry) => {
    if (entry.status === 'notified' && entry.notifiedAt && Date.now() - new Date(entry.notifiedAt).getTime() > windowMs) {
      entry.status = 'expired';
      affected.add(entry.sessionId);
    }
  });
  if (affected.size === 0) return 0;
  affected.forEach((sessionId) => recalc(state.waitlist, sessionId));
  save(state, ['waitlist']);
  for (const sessionId of affected) await dispatch(sessionId);
  return affected.size;
}

let expiryInFlight = null;
function processExpirations() {
  if (!expiryInFlight) {
    expiryInFlight = runExpiry()
      .catch(() => 0)
      .finally(() => {
        expiryInFlight = null;
      });
  }
  return expiryInFlight;
}

/* ---------- public API (mirrors docs/ARCHITECTURE.md) ---------- */

export async function getSessions() {
  await gate();
  const state = load();
  return state.sessions.map((session) => ({
    ...session,
    waitingCount: state.waitlist.filter((e) => e.sessionId === session.id && e.status === 'waiting').length,
  }));
}

export async function getWaitlist(sessionId) {
  await gate();
  const state = load();
  if (!state.sessions.some((s) => s.id === sessionId)) throw new ApiError('NOT_FOUND', 'Session not found.');
  return state.waitlist
    .filter((e) => e.sessionId === sessionId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export async function addWaitlistEntry(sessionId, input) {
  await gate();
  const values = {
    name: sanitizeText(input.name).trim(),
    phone: normalizePhone(sanitizeText(input.phone)),
    email: sanitizeText(input.email).trim().toLowerCase(),
  };
  const errors = validateWaitlistForm(values);
  if (Object.keys(errors).length > 0) throw new ApiError('VALIDATION', 'Please fix the highlighted fields.', errors);
  const state = load();
  if (!state.sessions.some((s) => s.id === sessionId)) throw new ApiError('NOT_FOUND', 'Session not found.');
  const active = ['waiting', 'notified'];
  if (state.waitlist.some((e) => e.sessionId === sessionId && e.email === values.email && active.includes(e.status))) {
    throw new ApiError('VALIDATION', 'This member is already on the waitlist.', {
      email: 'This member is already on the waitlist for this session.',
    });
  }
  let member = state.members.find((m) => m.email === values.email);
  if (!member) {
    member = { id: makeId('member'), ...values, createdAt: iso() };
    state.members.push(member);
  }
  const entry = {
    id: makeId('wait'), sessionId, memberId: member.id, name: values.name, phone: values.phone,
    email: values.email, position: null, status: 'waiting', joinedAt: iso(), notifiedAt: null, createdAt: iso(),
  };
  state.waitlist.push(entry);
  recalc(state.waitlist, sessionId);
  save(state, ['members', 'waitlist']);
  return entry;
}

const TRANSITIONS = { waiting: ['cancelled'], notified: ['confirmed', 'cancelled'] };

function setStatus(id, nextStatus) {
  const state = load();
  const entry = state.waitlist.find((e) => e.id === id);
  if (!entry) throw new ApiError('NOT_FOUND', 'Waitlist entry not found.');
  if (!TRANSITIONS[entry.status]?.includes(nextStatus)) {
    throw new ApiError('INVALID_STATE', `${entry.name} is ${entry.status} and cannot be marked ${nextStatus}.`);
  }
  entry.status = nextStatus;
  if (nextStatus === 'confirmed') {
    entry.confirmedAt = iso();
    const session = state.sessions.find((s) => s.id === entry.sessionId);
    if (session) session.seatsTaken = Math.min(session.totalSeats, session.seatsTaken + 1);
  }
  recalc(state.waitlist, entry.sessionId);
  save(state, ['waitlist', 'sessions']);
  return entry;
}

export async function updateWaitlistEntry(id, { status }) {
  await gate();
  return setStatus(id, status);
}

/** DELETE /api/waitlist/:id is a soft delete: the entry is kept with status "cancelled". */
export async function deleteWaitlistEntry(id) {
  await gate();
  setStatus(id, 'cancelled');
  return { success: true };
}

export async function notifyNext(sessionId) {
  await gate();
  const result = await dispatch(sessionId);
  if (!result) throw new ApiError('NO_WAITLIST', 'No members are waiting for this session.');
  return toResponse(result);
}

export async function notifyEntry(entryId) {
  await gate();
  const entry = load().waitlist.find((e) => e.id === entryId);
  if (!entry) throw new ApiError('NOT_FOUND', 'Waitlist entry not found.');
  return toResponse(await dispatch(entry.sessionId, entryId));
}

export async function getNotifications() {
  await gate();
  const state = load();
  return [...state.notifications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((n) => {
      const entry = state.waitlist.find((e) => e.id === n.waitlistEntryId);
      return { ...n, canRetry: n.status === 'failed' && n.attempts < state.settings.maxRetries && entry?.status === 'waiting' };
    });
}

export async function retryNotification(id) {
  await gate();
  const state = load();
  const notif = state.notifications.find((n) => n.id === id);
  if (!notif) throw new ApiError('NOT_FOUND', 'Notification not found.');
  if (notif.status !== 'failed') throw new ApiError('INVALID_STATE', 'Only failed notifications can be retried.');
  if (notif.attempts >= state.settings.maxRetries) {
    throw new ApiError('MAX_RETRIES', `Maximum of ${state.settings.maxRetries} attempts reached.`);
  }
  const entry = state.waitlist.find((e) => e.id === notif.waitlistEntryId);
  if (!entry || entry.status !== 'waiting') {
    throw new ApiError('INVALID_STATE', 'This member is no longer waiting, so the SMS cannot be retried.');
  }
  const session = state.sessions.find((s) => s.id === entry.sessionId);
  const body = buildBody(session, state.settings);
  const outcome = await attemptSms(entry.phone, body);
  const fresh = load();
  const result = applyOutcome(fresh, entry.id, notif.id, body, outcome);
  save(fresh, ['waitlist', 'notifications']);
  return toResponse(result);
}

export async function getDashboard() {
  await gate();
  const state = load();
  const sessions = state.sessions.map((session) => ({
    ...session,
    waitingCount: state.waitlist.filter((e) => e.sessionId === session.id && e.status === 'waiting').length,
  }));
  const counted = state.waitlist.filter((e) => e.status !== 'cancelled');
  const totalWaitMs = counted.reduce(
    (sum, e) => sum + ((e.notifiedAt ? new Date(e.notifiedAt).getTime() : Date.now()) - new Date(e.joinedAt).getTime()),
    0,
  );
  return {
    sessions,
    stats: {
      activeWaitlists: sessions.filter((s) => s.waitingCount > 0).length,
      smsSentToday: state.notifications.filter((n) => n.status !== 'failed' && isToday(n.sentAt)).length,
      failedSms: state.notifications.filter((n) => n.status === 'failed').length,
      avgWaitMinutes: counted.length ? Math.round(totalWaitMs / counted.length / MINUTE) : 0,
    },
  };
}

export async function getSettings() {
  await gate();
  return load().settings;
}

export async function saveSettings(input) {
  await gate();
  const errors = validateSettingsForm(input);
  if (Object.keys(errors).length > 0) throw new ApiError('VALIDATION', 'Please fix the highlighted fields.', errors);
  const state = load();
  state.settings = {
    confirmationWindowMinutes: Number(input.confirmationWindowMinutes),
    maxRetries: Number(input.maxRetries),
  };
  save(state, ['settings']);
  return state.settings;
}
