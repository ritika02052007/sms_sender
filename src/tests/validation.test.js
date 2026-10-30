import { describe, expect, it } from 'vitest';
import { maskPhone } from '../utils/maskPhone.js';
import { validateSettingsForm, validateWaitlistForm } from '../utils/validation.js';

describe('validateWaitlistForm', () => {
  it('accepts valid data', () => {
    expect(validateWaitlistForm({ name: 'Meera Joshi', phone: '+91 98765 43210', email: 'meera@example.com' })).toEqual({});
  });
  it('flags every missing field', () => {
    expect(Object.keys(validateWaitlistForm({ name: '', phone: '', email: '' }))).toEqual(['name', 'phone', 'email']);
  });
  it('flags malformed phone and email', () => {
    const errors = validateWaitlistForm({ name: 'Meera', phone: '12345', email: 'not-an-email' });
    expect(errors.phone).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.name).toBeUndefined();
  });
  it('rejects names with digits or symbols', () => {
    expect(validateWaitlistForm({ name: 'R2D2!!', phone: '+919876543210', email: 'a@b.co' }).name).toBeDefined();
  });
});

describe('validateSettingsForm', () => {
  it('accepts values in range', () => {
    expect(validateSettingsForm({ confirmationWindowMinutes: '15', maxRetries: '3' })).toEqual({});
  });
  it('rejects out-of-range and non-numeric values', () => {
    const errors = validateSettingsForm({ confirmationWindowMinutes: '0', maxRetries: 'abc' });
    expect(Object.keys(errors)).toEqual(['confirmationWindowMinutes', 'maxRetries']);
  });
});

describe('maskPhone', () => {
  it('shows only the last 4 digits', () => {
    expect(maskPhone('+919000007919')).toBe('+•••••••• 7919');
  });
  it('handles empty and very short values', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone('123')).toBe('•••');
  });
});
