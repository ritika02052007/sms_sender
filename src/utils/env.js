// Reads an optional numeric Vite env var, falling back to a default.
export function envNumber(name, fallback) {
  const raw = import.meta.env?.[name];
  const value = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(value) ? value : fallback;
}
