import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { toHaveNoViolations } from 'jest-axe';
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { configureMockApi } from '../api/mockApi.js';
import { configureTwilioMock } from '../services/twilioMock.js';

expect.extend(toHaveNoViolations);

// Deterministic mocks: no latency, no random failures unless a test opts in.
beforeEach(() => {
  localStorage.clear();
  configureMockApi({ latencyMin: 0, latencyMax: 0, failureRate: 0 });
  configureTwilioMock({ latencyMin: 0, latencyMax: 0, failureRate: 0 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
