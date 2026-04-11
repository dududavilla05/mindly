// In-memory rate limiter (resets on cold start / serverless restart)
const _map = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param key     - Unique key (e.g. IP address or userId)
 * @param limit   - Max requests allowed in the window
 * @param windowMs - Window size in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60 * 60 * 1000, // 1 hour
): boolean {
  const now = Date.now();
  const entry = _map.get(key);
  if (!entry || now > entry.resetAt) {
    _map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
