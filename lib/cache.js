'use strict';
const extend = require('gextend');
const EventEmitter = require('events');
const { CacheClientError } = require('./errors');

const options = require('./defaults');

class CacheClient extends EventEmitter {
    constructor(config = {}) {
        super();

        config = extend({}, this.constructor.options, config);
        if (config.autoinitialize) {
            this.init(config);
        }
    }

    init(config = {}) {
        if (this.initialized) return;
        this.initialized = true;
        extend(this, config);

        this.errors = [];

        if (!config.client) {
            this.client = this.createClient(this.clientOptions);
        }
    }

    testConnection(timeout = this.clientConnectionTimeout) {
        return new Promise(async(resolve, reject) => {
            let id = setTimeout(_ => {
                this.logger.warn('Client connection time out.');
                this.logger.warn('If your service needs TLS ensure your config is ok');
                this.logger.warn('client option tls=%s', this.clientOptions.tls);
                reject(new CacheClientError('Client connection time out'));
            }, timeout);

            await this.client.ping();

            clearTimeout(id);

            resolve();
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
     * @param {(key:string)} fallback Called on cache miss
     * @param {Object} options
     * @param {Int} [options.ttl=this.defaultTTL] TTL for this key
     * @param {Int} options.timeout Timeout in milliseconds for fallback function
     * @param {Function | Boolean} [options.deserialize=true] Save content e.g. as JSON
     * @param {Function} [options.serialize=this.serialize] Retrieve content as e.g. JSON
     * @param {Boolean} [options.addTimestamp=true] Include a timestamp to payload
     * @param {Boolean} [options.throwOnError=false] Throw if fallback errors
     * @param {Boolean} [options.forceCacheMiss=false] Throw if fallback errors
     * @param {Function} [options.forceCacheMiss] Called with current key and options
     * @returns {Promise}
     */
    async tryGet(key, fallback, options = {}) {
        options = extend({ ttl: this.defaultTTL }, this.tryGetOptions, options);

        let rawKey = key;

        key = this.hashKey(rawKey, options);

        let value;

        if (this.shouldQueryCache(key, options)) {
            try {
                this.logger.info('fetch "%s"', key);
                value = await this.get(key, false, options);
            } catch (error) {
                value = { $error: error };
                this.handleError(error, 'cache get error');
                if (options.throwOnError) throw error;
            }
        }

        if (value) {
            this.logger.info('cache OK "%s"', key);
            return value;
        }

        try {
            this.logger.info('cache miss "%s"', key);

            /**
             * If we pass a timeout then listen for
             * timeout errors.
             */
            if (options.timeout) {
                value = await this.promiseTimeout(
                    fallback(rawKey),
                    options.timeout,
                    new CacheClientError('Fallback function timeout', 408)
                );
            } else {
                value = await fallback(rawKey);
            }
        } catch (error) {
            value = { $error: error };
            this.handleError(error, 'cache fallback error');

            /**
             * If we had a timeout error then throw
             */
            if (error.code === 408) throw error;
            else if (options.throwOnError) throw error;
            else return value;
        }

        try {
            /**
             * We want to mark when we last accessed
             * the real value
             */
            this.makeTimestamp(value, options.addTimestamp);

            await this.set(key, value, options);
        } catch (error) {
            value = { $error: error };
            this.handleError(error, 'cache set error');

            if (options.throwOnError) throw error;
        }

        return value;
    }

    /**
     * Retrieve key from store.
     *
     * @param {String} key cache key
     * @param {Any} def Any value
     * @param {Object} options
     * @param {Boolean} [options.deserialize=true] Return value as JSON
     * @param {Boolean} [options.buffer=false] Get key as binary data
     * @returns {Promise}
     */
    async get(key, def, options = {}) {
        key = this.hashKey(key);

        if (typeof options === 'boolean') {
            options = { deserialize: options };
        }

        let { deserialize, buffer } = extend({
            buffer: false,
            deserialize: true,
        }, options);

        let value = buffer ?
            this.client.getBuffer(key) :
            this.client.get(key);

        value = await value;

        if (!value) return def;

        if (deserialize === true) {
            return await this.deserialize(value);
        }

        if (typeof deserialize === 'function') return await deserialize(value);

        return value;
    }

    /**
     * Set a key in cache
     * @param {String} key cache key
     * @param {Object|String} value Value to cache
     * @param {Object} options
     * @param {Int} [options.ttl=this.defaultTTL] Time to live for this key
     * @returns {Promise}
     */
    async set(key, value, options = {}) {
        key = this.hashKey(key, options);

        let defaultTTL = this.defaultTTL;
        if (typeof options === 'number') {
            defaultTTL = options;
            options = {};
        }

        let { ttl, serialize } = extend({
            ttl: defaultTTL,
            serialize: this.serialize
        }, options);

        if (typeof value !== 'string') value = await serialize(value);

        return this.client.set(key, value, this.timeUnit, ttl);
    }

    /**
     * Remove key from cache.
     * @param {String} key cache key
     * @param {Object} key cache key
     * @returns {Promise}
     */
    del(key) {
        key = this.hashKey(key, options);
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
    hashKey(key, options = {}) {
        if (this.hashKeys === false) return key;
        if (typeof key !== 'string') key = this.keySerializer(key, options);
        if (this.isHashKey(key, options)) return key;

        let hash = this.keyHashFunction(key, options);

        if (this.hasUUIDFormat(key) && this.hashUUIDs === false) {
            hash = key;
        }

        return `${this.cacheKeyPrefix}${hash}`;
    }

    isHashKey(key, options = {}) {
        if (typeof key !== 'string') key = this.keySerializer(key);
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
         * This will delete all keys!
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
                this.handleError(error, `purge keys error: ${match}`);
                reject(error);
            });
        });
    }

    shouldQueryCache(key, options = {}) {
        if (typeof options.forceCacheMiss === 'function') {
            return !options.forceCacheMiss(key, options);
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

    handleError(error, label = 'Cache client error') {
        this.logger.error(label);
        this.logger.error(error.message);
        this.lastError = error;
        this.errors.push(error);
    }
}

CacheClient.options = options;

module.exports = CacheClient;