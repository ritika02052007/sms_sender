/**
 * Strips HTML and script-like content from free text so it is safe to store
 * in state. React escapes on render too; this is defence in depth.
 */
export function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript\s*:/gi, '');
}
