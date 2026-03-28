/** Validates numeric string IDs used by the SQLite API (matches former ObjectId string usage in URLs). */
export function isValidId(id) {
  if (id == null || typeof id !== 'string') return false;
  const n = Number(id);
  return Number.isInteger(n) && n > 0;
}
