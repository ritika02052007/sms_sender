import { describe, expect, it } from 'vitest';
import { configureTwilioMock, sendSms } from '../services/twilioMock.js';

describe('Twilio mock', () => {
  it('resolves with a Twilio-like message on success', async () => {
    const result = await sendSms('+919876543210', 'Hello');
    expect(result).toMatchObject({ status: 'queued', to: '+919876543210', body: 'Hello' });
    expect(result.sid).toMatch(/^SM[A-Z0-9]{10}$/);
  });
  it('rejects on simulated failure', async () => {
    configureTwilioMock({ failureRate: 1 });
    await expect(sendSms('+919876543210', 'Hello')).rejects.toThrow('Mock Twilio failure');
  });
  it('rejects when the recipient or body is missing', async () => {
    await expect(sendSms('', 'Hello')).rejects.toThrow(/required/);
    await expect(sendSms('+919876543210', '')).rejects.toThrow(/required/);
  });
});
