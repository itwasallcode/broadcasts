export function nextNumberedName(names, prefix) {
  const start = `${prefix.toLowerCase()} `;
  const highest = names.reduce((maximum, name) => {
    const normalized = name.trim().toLowerCase();
    if (!normalized.startsWith(start)) return maximum;
    const suffix = normalized.slice(start.length);
    const number = Number(suffix);
    return /^\d+$/.test(suffix) && Number.isSafeInteger(number) && number < Number.MAX_SAFE_INTEGER
      ? Math.max(maximum, number)
      : maximum;
  }, 0);
  return `${prefix} ${highest + 1}`;
}
