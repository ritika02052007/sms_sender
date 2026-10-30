/** Masks all but the last 4 digits: +919000007919 -> +•••••••• 7919 */
export function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  const plus = String(phone).trim().startsWith('+') ? '+' : '';
  if (digits.length <= 4) return `${plus}${'•'.repeat(digits.length)}`;
  return `${plus}${'•'.repeat(digits.length - 4)} ${digits.slice(-4)}`;
}
