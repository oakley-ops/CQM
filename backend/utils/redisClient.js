const Redis = require('ioredis');
const logger = require('./logger');

let client = null;
let available = false;

const connect = () => {
  const redisUrl = process.env.REDIS_URL || null;
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT) || 6379;

  const options = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // disable auto-reconnect — fail fast
    connectTimeout: 3000,
  };

  client = redisUrl ? new Redis(redisUrl, options) : new Redis({ host, port, ...options });

  client.on('connect', () => {
    available = true;
    logger.info('Redis connected');
  });

  client.on('error', (err) => {
    if (available) {
      logger.warn(`Redis error: ${err.message}`);
    }
    available = false;
  });

  client.on('close', () => {
    available = false;
  });

  client.connect().catch((err) => {
    logger.warn(`Redis unavailable — token blocklist disabled: ${err.message}`);
    available = false;
  });
};

const isAvailable = () => available;

const get = async (key) => {
  if (!available) return null;
  return client.get(key);
};

const set = async (key, value, ttlSeconds) => {
  if (!available) return;
  await client.set(key, value, 'EX', ttlSeconds);
};

const del = async (key) => {
  if (!available) return;
  await client.del(key);
};

module.exports = { connect, isAvailable, get, set, del };
