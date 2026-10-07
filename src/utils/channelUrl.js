export function sanitizeChannelUrl(value) {
  if (typeof value !== 'string') return null;
  return /^https:\/\/www\.youtube\.com\/(?:@[^/?#\s]+|(?:channel|c|user)\/[^/?#\s]+)\/?$/.test(
    value
  )
    ? value
    : null;
}
