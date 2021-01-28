'use strict';

const crypto = require('crypto');
const extend = require('gextend');
const EventEmitter = require('events');

const defaults = require('./defaults');

class CacheClient extends EventEmitter {
    constructor(config = {}) {
        super();

        config = extend({}, this.constructor.defaults, config);
        if (config.autoinitialize) {
            this.init(config);
        }
    }

    init(config = {}) {
        if (this.initialized) return;
        this.initialized = true;
        extend(this, config);

        if (!config.client) {
            this.client = this.createClient(this.clientOptions);
        }

        this.client.on('error', error => {
            this.handleError(error, 'Redis client error');
            this.emit('error', error);
        });

        this.client.on('connect', c => {
            this.logger.info('new redis connection');
            this.emit('connect', c);
        });

        this.client.on('ready', event => {
            this.logger.info('redis ready event...');
            this.emit('ready', event);
        });

        this.client.on('close', event => {
            this.logger.info('redis close event...');
            this.emit('close', event);
        });

        this.client.on('reconnecting', event => {
            this.logger.info('redis reconnecting event...');
            this.emit('reconnecting', event);
        });
    }

    /**
     * Get object related to `key` if present, if cache miss
     * we run `fallback` and cache the value returned from that.
     * 
     * @param {String} key raw key 
     * @param {Function} fallback Called on cache miss 
     * @param {Int} ttl TTL for this key
     * @param {Boolean} [serialize=true] Retrieve content as JSON
     * @param {Boolean} [addTimestamp=true] Include a timestamp to payload
     * @returns {Promise}
     */
    async tryGet(key, fallback, ttl = this.defaultTtl, serialize = true, addTimestamp = true) {

        key = this.hashKey(key);

        let value = await this.get(key, false, serialize);
        if (value) return value;

        try {
            value = await fallback();
            /**
             * We want to mark when we last accessed
             * the real value
             */
            this.makeTimestamp(value, addTimestamp);

            await this.set(key, value, ttl);
        } catch (error) {
            value = { $error: error };
            this.logger.error('Error in cache try');
            this.logger.error(error.message);
            this.handleError(error, 'cache try error');
        }

        return value;
    }

    /**
     * Retrieve key from store.
     * 
     * @param {String} key cache key
     * @param {Any} def Any value
     * @param {Boolean} [deserialize=true] Return value as JSON
     * @returns {Promise}
     */
    async get(key, def, deserialize = true) {
        key = this.hashKey(key);
        let value = await this.client.get(key);
        if (value && !deserialize) return value;
        if (value && deserialize) return this.deserialize(value);
        return def;
    }

    /**
     * Set a key in cache
     * @param {String} key cache key
     * @param {Object|String} value Value to cache
     * @param {Int} ttl Time to live for this key
     * @returns {Promise}
     */
    set(key, value, ttl = this.defaultTtl) {
        key = this.hashKey(key);
        if (typeof value !== 'string') value = this.serialize(value);
        return this.client.set(key, value, this.timeUnit, ttl);
    }

    /**
     * Remove key from ache
     * @param {String} key cache key
     * @returns {Promise}
     */
    del(key) {
        key = this.hashKey(key);
        return this.client.del(key);
    }

    /**
     * Format key.
     * @param {String} key raw value to hash 
     * @param {Object} key raw value to hash 
     * @returns {String} Formatted key
     */
    hashKey(key) {
        if (this.hashKeys === false) return key;
        if (typeof key !== 'string') key = this.serialize(key);
        if (this.isHashKey(key)) return key;
        let hash = crypto.createHash('md5').update(key).digest('hex');
        return `${this.cacheKeyPrefix}${hash}`;
    }

    isHashKey(key) {
        if (typeof key !== 'string') key = this.serialize(key);
        return !!this.cacheKeyMatcher.exec(key);
    }

    get timeUnit() {
        return this.ttlInSeconds ? 'EX' : 'PX';
    }

    handleError(error, label) {
        if (label) this.logger.error(label);
        this.logger.error(error.message);
        this.lastError = error;
        this.errors.push(error);
    }
}

CacheClient.defaults = defaults;

module.exports = CacheClient;
