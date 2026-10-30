import { envNumber } from '../utils/env.js';

/**
 * Mock Twilio service. Mimics a Twilio Message resource and fails randomly
 * (~15% by default) so retry logic can be exercised. No real SMS is sent.
 */
const config = {
  latencyMin: envNumber('VITE_MOCK_API_LATENCY_MIN', 600),
  latencyMax: envNumber('VITE_MOCK_API_LATENCY_MAX', 1200),
  failureRate: envNumber('VITE_TWILIO_MOCK_FAILURE_RATE', 0.15),
};

export function configureTwilioMock(partial) {
  Object.assign(config, partial);
}

export function sendSms(to, body) {
  return new Promise((resolve, reject) => {
    if (!to || !body) {
      reject(new Error('Mock Twilio error: "to" and "body" are required'));
      return;
    }
    const latency = config.latencyMin + Math.random() * (config.latencyMax - config.latencyMin);
    setTimeout(() => {
      if (Math.random() < config.failureRate) {
        reject(new Error('Mock Twilio failure'));
        return;
      }
      const sid = `SM${Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(10, '0')}`;
      resolve({ sid, status: 'queued', to, body, dateCreated: new Date().toISOString() });
    }, latency);
  });
}
