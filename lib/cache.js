'use strict';
const promiseTimeout = require('p-timeout');
const crypto = require('crypto');
const extend = require('gextend');
const EventEmitter = require('events');
const { CacheClientError } = require('./errors');

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

        let connectionId;

        /**
         * TODO: This will most likely generate
         * an uncaught error since is an async
         * error from the constructor. For now
         * it is ok since we want to throw if
         * the redis connection is not ok.
         */
        if (config.clientConnectionTimeout) {
            connectionId = setTimeout(_ => {
                this.logger.warn('Client connection time out.');
                this.logger.warn('If your service needs TLS ensure your config is ok');
                this.logger.warn('client option tls=%s', this.clientOptions.tls);
                throw new CacheClientError('Client connection time out', code);
            }, config.clientConnectionTimeout);
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
            clearTimeout(connectionId);
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
     * You can use `forceCacheMiss` to always execute the `fallback`
     * function thus bypassing the cache altogether.
     *
     * @param {String} key raw key
     * @param {Function} fallback Called on cache miss
     * @param {Object} options
     * @param {Int} [options.ttl=defaultTTL] TTL for this key
     * @param {Int} options.timeout Timeout in milliseconds for fallback function
     * @param {Boolean} [options.deserialize=true] Retrieve content as JSON
     * @param {Boolean} [options.addTimestamp=true] Include a timestamp to payload
     * @param {Boolean} [options.throwOnError=false] Throw if fallback errors
     * @param {Boolean} [options.forceCacheMiss=false] Throw if fallback errors
     * @param {Function} [options.forceCacheMiss] Called with current key and options
     * @returns {Promise}
     */
    async tryGet(key, fallback, options = {}) {
        options = extend({ ttl: this.defaultTTL }, this.tryGetOptions, options);

        key = this.hashKey(key);

        let value;

        if (this.shouldQueryCache(key, options)) {
            this.logger.info('fetching "%s"', key);
            value = await this.get(key, false, options.deserialize);
        }

        if (value) {
            this.logger.info('returning cached value!');
            return value;
        }

        try {
            this.logger.info('cache miss "%s"', key);

            /**
             * If we pass a timeout then listen for
             * timeout errors.
             */
            if (options.timeout) {
                value = await promiseTimeout(fallback(), options.timeout, new CacheClientError('Fallback function timeout', 408));
            } else {
                value = await fallback();
            }

            /**
             * We want to mark when we last accessed
             * the real value
             */
            this.makeTimestamp(value, options.addTimestamp);

            await this.set(key, value, options.ttl);
        } catch (error) {
            value = { $error: error };
            this.logger.error('Error in cache try');
            this.logger.error(error.message);
            this.handleError(error, 'cache try error');

            /**
             * If we had a timeout error then throw
             */
            if (error.code === 408) throw error;
            else if (options.throwOnError) throw error;
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
    set(key, value, ttl = this.defaultTTL) {
        key = this.hashKey(key);
        if (typeof value !== 'string') value = this.serialize(value);
        return this.client.set(key, value, this.timeUnit, ttl);
    }

    /**
     * Remove key from cache.
     * @param {String} key cache key
     * @param {Object} key cache key
     * @returns {Promise}
     */
    del(key) {
        key = this.hashKey(key);
        return this.client.del(key);
    }

    /**
     * Format `key`.
     *
     * If `key` is an object it will be
     * `serialize`d into a string.
     *
     * If `key` is a string it will be hashed
     * and appended to `cacheKeyPrefix`.
     *
     * Keys look like:
     * ```js
     * cache:1239ecd04b073b8f4615d4077be5e263
     * ```
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

    /**
     * Purge all keys matching the `match` pattern.
     * @example ```js
     * cache.purgeKeys('cache:*');
     * ```
     * @param {String} match Pattern to match
     * @param {Integer} count Number of keys per cycle
     * @returns {Promise}
     */
    purgeKeys(match = this.cacheKeyPrefix, count = 100) {
        /**
         * If we use the default cache key prefix
         * ensure we have a valid match pattern.
         */
        if (match === this.defaultCacheKeyPrefix && !match.includes('*')) {
            match = `${this.defaultCacheKeyPrefix}*`;
        }

        const stream = this.client.scanStream({
            match,
            count,
        });

        let total = 0,
            step = 0;
        let pipeline = this.client.pipeline();

        return new Promise((resolve, reject) => {
            stream.on('data', async(keys = []) => {
                step += keys.length;
                total += keys.length;

                for (let key of keys) pipeline.del(key);

                if (step > count) {
                    await pipeline.exec();
                    step = 0;
                    pipeline = this.client.pipeline();
                    this.logger.info('cache purging keys...');
                }
            });

            stream.on('end', async _ => {
                if (pipeline) await pipeline.exec();

                this.logger.info('cache purged %s keys!', total);

                resolve({
                    match,
                    total,
                });
            });

            stream.on('error', error => {
                this.logger.error('Error purging keys: %s', match);
                this.logger.error(error);
                reject(error);
            });
        });
    }

    shouldQueryCache(key, options) {
        if (typeof options.forceCacheMiss === 'function') {
            return options.forceCacheMiss(key, options);
        }

        /**
         * If we set `forceCacheMiss` to true
         * then we should skip cache and fallback
         * to our source function.
         */
        return options.forceCacheMiss !== true;
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