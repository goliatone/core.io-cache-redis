'use strict';

const extend = require('gextend');

const defaults = (o = {}) => {

    const env = o.env || process.env;

    return {
        url: env.REDIS_URL,
        port: env.REDIS_PORT || 6379,
        host: env.REDIS_HOST || 'localhost',
        password: env.REDIS_PASSWORD,
        tls: env.REDIS_TLS || false,
        redisFactory(url) {
            const Redis = require('ioredis');
            return new Redis(url);
        }
    };
};

/**
 * Create a new redis client.
 *
 * @param {Object} config Configuration options
 * @returns
 */
function createClient(config = {}) {
    config = extend({}, defaults(config.env), config);

    if (config.url) return config.redisFactory(config.url);

    const host = config.host;
    const port = config.port;
    const password = config.password;

    const protocol = config.tls ? 'rediss' : 'redis';

    const queryString = password ? `?password=${encodeURIComponent(password)}` : '';

    const url = `${protocol}://${host}:${port}` + queryString;

    return config.redisFactory(url);
}


module.exports = createClient;