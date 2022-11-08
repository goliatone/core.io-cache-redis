const extend = require('gextend');
const crypto = require('crypto');
const promiseTimeout = require('./timeout');

const createClient = require('./createClient');
const _5_seconds = 5 * 1000;
const _24_hours = (1 * 24 * 60 * 60 * 1000);

const defaultCacheKeyPrefix = 'cache:';

module.exports = {
    autoinitialize: true,
    logger: extend.shim(console),
    /**
     * TTL value for expire
     * keys in milliseconds by default.
     */
    defaultTTL: _24_hours,
    /**
     * Use TTL as seconds?
     */
    ttlInSeconds: false,
    clientConnectionTimeout: _5_seconds,
    lastError: null,
    createClient,
    hashKeys: true,
    defaultCacheKeyPrefix,
    cacheKeyPrefix: defaultCacheKeyPrefix,
    tryGetOptions: {
        deserialize: true,
        addTimestamp: true,
        throwOnError: false,
        forceCacheMiss: false,
    },
    /**
     * Matches the string `cache:` followed
     * by an md5 hash.
     */
    cacheKeyMatcher: /^cache:[a-z0-9]{32}$/i,
    /**
     * Should we hash raw keys
     * that have a UUID format?
     */
    hashUUIDs: true,

    /**
     * Default redis client options.
     * These will be passed to the `createClient`
     * function.
     */
    clientOptions: {
        port: 6379,
        host: 'localhost',
        tls: false,
        showFriendlyErrorStack: true
    },

    /**
     * Promise with a timeout implementation.
     */
    promiseTimeout(fallback, timeout, error, o) {
        return promiseTimeout(fallback, timeout, error, o);
    },

    /**
     * Stringify raw key objects.
     * @param {Object} obj Raw key
     * @returns {string} Serialized key
     */
    keySerializer(obj, options = {}) {
        return this.serialize(obj);
    },
    keyHashFunction(key, options = {}) {
        return crypto.createHash('md5').update(key).digest('hex');
    },
    serialize(obj) {
        return JSON.stringify(obj);
    },
    deserialize(value) {
        return JSON.parse(value);
    },
    makeTimestamp(value, addTimestamp) {
        if (typeof value !== 'object' || !addTimestamp) return value;

        if (value.hasOwnProperty('cachedOn')) value.cachedOn = Date.now();
        else value._cachedOn = Date.now();

        return value;
    },
    /**
     * If `strict` is true then we use a
     * regular expression for compatible with
     * the RFC4122.
     *
     * @param {String} str
     * @param {Boolean} [strict=false]
     * @returns {Boolean}
     */
    hasUUIDFormat(str = '', strict = false) {
        if (strict) {
            return !!str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        }
        return !!str.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i);
    }
};