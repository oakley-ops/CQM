/**
 * Token blocklist via Redis.
 *
 * Instead of tracking individual tokens (which requires storing them at login),
 * we store a per-user "deactivated_at" timestamp. Any token whose `iat` (issued-at)
 * predates that timestamp is treated as revoked.
 *
 * Redis key: blocklist:user:{userId}
 * Value:     Unix timestamp (seconds) at which the user was deactivated
 * TTL:       Matches JWT_EXPIRE so entries auto-expire when no valid token could exist
 */

const redis = require('./redisClient');

// Parse JWT_EXPIRE env var into seconds (e.g. "1d" -> 86400, "7d" -> 604800, "3600" -> 3600)
const parseExpireSeconds = () => {
  const val = process.env.JWT_EXPIRE || '1d';
  if (/^\d+$/.test(val)) return parseInt(val);
  const match = val.match(/^(\d+)([smhd])$/);
  if (!match) return 86400;
  const n = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * multipliers[unit];
};

const JWT_TTL_SECONDS = parseExpireSeconds();

/**
 * Record that all tokens for this user issued before `nowSeconds` are invalid.
 * Call this when deactivating a user.
 */
const blockUser = async (userId) => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  await redis.set(`blocklist:user:${userId}`, nowSeconds, JWT_TTL_SECONDS);
  return nowSeconds;
};

/**
 * Remove a user from the blocklist (e.g. when re-activating them).
 */
const unblockUser = async (userId) => {
  await redis.del(`blocklist:user:${userId}`);
};

/**
 * Check whether the given decoded JWT payload is blocked.
 * Returns true (token is invalid) if:
 *   - Redis is available AND blocklist entry exists AND token.iat < blocklist timestamp
 * Returns false (token is valid / blocklist unavailable) otherwise.
 *
 * NOTE: when Redis is unavailable the is_active DB flag in protect() still catches
 * deactivated users — this blocklist is an additional layer for speed.
 */
const isTokenBlocked = async (decoded) => {
  if (!redis.isAvailable()) return false;
  const blockedAt = await redis.get(`blocklist:user:${decoded.id}`);
  if (!blockedAt) return false;
  return decoded.iat < parseInt(blockedAt);
};

module.exports = { blockUser, unblockUser, isTokenBlocked, JWT_TTL_SECONDS };
