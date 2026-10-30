import { describe, expect, it } from 'vitest';
import {
  ApiError, addWaitlistEntry, deleteWaitlistEntry, getDashboard, getNotifications, getSessions,
  getWaitlist, notifyEntry, notifyNext, retryNotification, saveSettings, updateWaitlistEntry,
} from '../api/mockApi.js';
import { configureTwilioMock } from '../services/twilioMock.js';

const GOOD = { name: 'Test User', phone: '+91 98765 43210', email: 'test.user@example.com' };

describe('data structure (manager story: consistent outputs)', () => {
  it('returns sessions and waitlist entries with a consistent shape', async () => {
    const [session] = await getSessions();
    expect(session).toEqual(expect.objectContaining({
      id: expect.any(String), className: expect.any(String), startTime: expect.any(String),
      totalSeats: expect.any(Number), seatsTaken: expect.any(Number), waitingCount: expect.any(Number),
    }));
    const [entry] = await getWaitlist('session-1');
    expect(entry).toEqual(expect.objectContaining({
      id: expect.any(String), sessionId: 'session-1', name: expect.any(String), phone: expect.any(String),
      email: expect.any(String), status: expect.any(String), joinedAt: expect.any(String),
    }));
  });
  it('computes dashboard stats from real data', async () => {
    const { stats } = await getDashboard();
    expect(stats).toMatchObject({ activeWaitlists: 4, smsSentToday: 1, failedSms: 1 });
    expect(stats.avgWaitMinutes).toBeGreaterThan(0);
  });
});

describe('addWaitlistEntry', () => {
  it('sanitizes input, normalizes the phone number and assigns a position', async () => {
    const entry = await addWaitlistEntry('session-6', { ...GOOD, name: '<b>Test</b> User<script>x()</script>' });
    expect(entry.name).toBe('Test User');
    expect(entry.phone).toBe('+919876543210');
    expect(entry.position).toBe(1);
  });
  it('rejects invalid input with per-field errors', async () => {
    await expect(addWaitlistEntry('session-6', { name: '', phone: '1', email: 'bad' })).rejects.toMatchObject({
      code: 'VALIDATION', fields: { name: expect.any(String), phone: expect.any(String), email: expect.any(String) },
    });
  });
  it('rejects duplicates on the same session', async () => {
    await addWaitlistEntry('session-6', GOOD);
    await expect(addWaitlistEntry('session-6', GOOD)).rejects.toMatchObject({ fields: { email: expect.any(String) } });
  });
});

describe('SMS job', () => {
  it('notifies the first waiting member and marks them notified', async () => {
    const result = await notifyNext('session-1');
    expect(result.memberName).toBe('Priya Nair');
    const entries = await getWaitlist('session-1');
    expect(entries.find((e) => e.id === 'wait-seed-2').status).toBe('notified');
    expect(entries.find((e) => e.id === 'wait-seed-3').position).toBe(1);
  });
  it('notifies a single entry', async () => {
    const result = await notifyEntry('wait-seed-3');
    expect(result.memberName).toBe('Rohan Mehta');
  });
  it('throws when nobody is waiting', async () => {
    await expect(notifyNext('session-6')).rejects.toMatchObject({ code: 'NO_WAITLIST' });
  });
  it('records a failed notification when Twilio fails', async () => {
    configureTwilioMock({ failureRate: 1 });
    await expect(notifyNext('session-3')).rejects.toMatchObject({ code: 'SMS_FAILED' });
    const failed = (await getNotifications()).find((n) => n.waitlistEntryId === 'wait-seed-8');
    expect(failed).toMatchObject({ status: 'failed', attempts: 1, canRetry: true });
  });
  it('retries failed SMS and stops at 3 attempts', async () => {
    configureTwilioMock({ failureRate: 1 });
    await expect(retryNotification('notif-seed-2')).rejects.toMatchObject({ code: 'SMS_FAILED' }); // attempt 2
    await expect(retryNotification('notif-seed-2')).rejects.toMatchObject({ code: 'SMS_FAILED' }); // attempt 3
    const notification = (await getNotifications()).find((n) => n.id === 'notif-seed-2');
    expect(notification).toMatchObject({ attempts: 3, canRetry: false });
    await expect(retryNotification('notif-seed-2')).rejects.toMatchObject({ code: 'MAX_RETRIES' });
  });
  it('marks the member notified when a retry succeeds', async () => {
    await retryNotification('notif-seed-2');
    const entries = await getWaitlist('session-2');
    expect(entries.find((e) => e.id === 'wait-seed-5').status).toBe('notified');
    expect((await getNotifications()).find((n) => n.id === 'notif-seed-2')).toMatchObject({ attempts: 2, status: 'queued' });
  });
  it('only retries failed notifications', async () => {
    await expect(retryNotification('notif-seed-1')).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
});

describe('confirmation window expiry', () => {
  it('expires stale notified entries, notifies the next person and recalculates positions', async () => {
    await getWaitlist('session-1'); // seeds storage
    const stored = JSON.parse(localStorage.getItem('waitlist'));
    stored.find((e) => e.id === 'wait-seed-1').notifiedAt = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    localStorage.setItem('waitlist', JSON.stringify(stored));

    const entries = await getWaitlist('session-1');
    expect(entries.find((e) => e.id === 'wait-seed-1').status).toBe('expired');
    expect(entries.find((e) => e.id === 'wait-seed-2').status).toBe('notified');
    expect(entries.find((e) => e.id === 'wait-seed-3').position).toBe(1);
    expect(entries.find((e) => e.id === 'wait-seed-4').position).toBe(2);
  });
});

describe('status changes and settings', () => {
  it('confirms a notified entry and rejects invalid transitions', async () => {
    await updateWaitlistEntry('wait-seed-1', { status: 'confirmed' });
    await expect(updateWaitlistEntry('wait-seed-2', { status: 'confirmed' })).rejects.toBeInstanceOf(ApiError);
  });
  it('cancels (soft deletes) an entry and recalculates positions', async () => {
    await deleteWaitlistEntry('wait-seed-2');
    const entries = await getWaitlist('session-1');
    expect(entries.find((e) => e.id === 'wait-seed-2').status).toBe('cancelled');
    expect(entries.find((e) => e.id === 'wait-seed-3').position).toBe(1);
  });
  it('validates settings', async () => {
    await expect(saveSettings({ confirmationWindowMinutes: '0', maxRetries: '9' })).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(saveSettings({ confirmationWindowMinutes: '30', maxRetries: '2' })).resolves.toEqual({ confirmationWindowMinutes: 30, maxRetries: 2 });
  });
});

describe('network failures', () => {
  it('surfaces simulated network errors', async () => {
    const { configureMockApi } = await import('../api/mockApi.js');
    configureMockApi({ failureRate: 1 });
    await expect(getSessions()).rejects.toThrow(/Mock network error/);
  });
});
