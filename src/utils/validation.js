export function normalizePhone(value) {
  return String(value ?? '').replace(/[\s\-().]/g, '');
}

const NAME_PATTERN = /^\p{L}[\p{L} .'-]{1,59}$/u;
const PHONE_PATTERN = /^\+?\d{10,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns an object of { field: message }. Empty object means valid. */
export function validateWaitlistForm({ name, phone, email }) {
  const errors = {};
  const cleanName = String(name ?? '').trim();
  const cleanEmail = String(email ?? '').trim();
  if (!cleanName) errors.name = 'Name is required.';
  else if (!NAME_PATTERN.test(cleanName)) errors.name = 'Enter a valid name (2-60 letters).';

  if (!String(phone ?? '').trim()) errors.phone = 'Phone number is required.';
  else if (!PHONE_PATTERN.test(normalizePhone(phone))) {
    errors.phone = 'Enter a valid phone number, e.g. +91 98765 43210.';
  }

  if (!cleanEmail) errors.email = 'Email is required.';
  else if (!EMAIL_PATTERN.test(cleanEmail)) errors.email = 'Enter a valid email, e.g. name@example.com.';
  return errors;
}

function checkInteger(value, min, max, label) {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return `${label} must be a whole number.`;
  const number = Number(text);
  if (number < min || number > max) return `${label} must be between ${min} and ${max}.`;
  return null;
}

export function validateSettingsForm({ confirmationWindowMinutes, maxRetries }) {
  const errors = {};
  const windowError = checkInteger(confirmationWindowMinutes, 1, 120, 'Confirmation window');
  const retriesError = checkInteger(maxRetries, 1, 5, 'Max retries');
  if (windowError) errors.confirmationWindowMinutes = windowError;
  if (retriesError) errors.maxRetries = retriesError;
  return errors;
}
