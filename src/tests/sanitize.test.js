import { describe, expect, it } from 'vitest';
import { sanitizeText } from '../utils/sanitize.js';

describe('sanitizeText (XSS)', () => {
  it('removes script tags and their content', () => {
    expect(sanitizeText('<script>alert(1)</script>Meera')).toBe('Meera');
  });
  it('removes tags with event handlers', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>Hello')).toBe('Hello');
  });
  it('strips inline formatting tags and stray angle brackets', () => {
    expect(sanitizeText('<b>Bold</b> a < b')).toBe('Bold a  b');
  });
  it('removes javascript: URLs', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
  });
  it('keeps normal text and ampersands untouched', () => {
    expect(sanitizeText("Tom & Jerry O'Neil")).toBe("Tom & Jerry O'Neil");
  });
  it('handles null and undefined', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });
});
