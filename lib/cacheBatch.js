const extend = require('gextend');
const CacheClient = require('./cache');
const { CacheClientError } = require('./errors');

/**
 * Options for tryGetBatch
 * @typedef {Object} GetBatchOptions
 * @property {Int} [ttl=defaultTTL] TTL for this key
 * @property {Int} timeout Timeout in milliseconds for fallback function
 * @property {Function} [deserialize=this.deserialize] Retrieve content as JSON
 * @property {Boolean} [addTimestamp=true] Include a timestamp to payload
 * @property {Boolean} [throwOnError=false] Throw if fallback errors
 * @property {Boolean} [forceCacheMiss=false] Throw if fallback errors
 * @property {Function} [forceCacheMiss] Called with current key and options
 */

const hasCacheKeys = a => a.concat().filter(Boolean).length > 0;

class BatchCacheClient extends CacheClient {

    /**
     * Get a list of objects with the related `key`.
     * We run `fallback` with the keys that were not found in
     * cache.
     *
     * You can use `forceCacheMiss` to always execute the `fallback`
     * function thus bypassing the cache altogether.
     *
     * @param {Array<string>} keys raw keys
     * @param {(keys:string[])} fallback Called on cache miss
     * @param {GetBatchOptions} options
     * @returns {Promise}
     */
    async tryGetBatch(keys, fallback, options = {}) {
        options = extend({ ttl: this.defaultTTL }, this.tryGetOptions, options);

        /**
         * Keep a copy of the raw keys
         * so we can use them as argument
         * for the fallback function.
         */
        let rawKeys = keys.concat();

        /**
         * Ensure we get all rightly
         * formatted keys.
         */
        keys = this.hashKeyBatch(keys);


        let getKeys = [],
            cachedValues = [];

        /**
         * Set to null all keys that we
         * should get directly from our
         * fallback function.
         */
        for (const index in keys) {
            const key = keys[index];
            const shouldQuery = this.shouldQueryCache(key, options);
            getKeys[index] = shouldQuery ? key : null;
        }

        /**
         * Query the keys that passed
         * shouldQueryCache:
         */
        if (hasCacheKeys(getKeys)) {
            cachedValues = await this.getBatch(getKeys, [], options);
        }

        /**
         * If all keys were found in
         * the cache. Return values...
         */
        if (notEmpty(cachedValues) === rawKeys.length) {
            return cachedValues;
        }

        let values = [],
            batchKeys = [],
            batchValues = [],
            mappedIndices = [];

        for (const index in cachedValues) {

            let cachedValue = cachedValues[index];

            /**
             * We got a value from the cache
             * so we set add it to the returned
             * values array.
             */
            if (cachedValue) {
                values[index] = cachedValue;
            } else {
                /**
                 * We should fallback for the
                 * key at index.
                 * We want to map the original
                 * index to the position in the
                 * fallback set of keys.
                 */
                batchKeys.push(rawKeys[index]);
                mappedIndices[batchKeys.length - 1] = index;
            }
        }

        try {
            /**
             * If we pass a timeout then listen for
             * timeout errors.
             */
            if (options.timeout) {
                batchValues = await this.promiseTimeout(
                    fallback(batchKeys),
                    options.timeout,
                    new CacheClientError('Fallback function timeout', 408)
                );
            } else {
                batchValues = await fallback(batchKeys);
            }
        } catch (error) {
            values = { $error: error };
            this.handleError(error, 'cache batch fallback error');

            /**
             * If we had a timeout error then throw
             */
            if (error.code === 408) throw error;
            else if (options.throwOnError) throw error;
            else return values;
        }

        const setValues = [];
        for (const i in batchValues) {
            let value = batchValues[i];
            /**
             * We want to mark when we last accessed
             * the real value
             */
            this.makeTimestamp(value, options.addTimestamp);

            /**
             * We need to go back from the
             * batch index to the final
             * value index
             */
            const index = mappedIndices[i];

            /**
             * Update the value for the
             * given index in the return
             * object.
             */
            if (index) {
                values[index] = value;
                setValues.push(value);
            }
        }

        try {
            await this.setBatch(batchKeys, setValues, options);
        } catch (error) {
            values = { $error: error };
            this.handleError(error, 'cache setBatch error');
            if (options.throwOnError) throw error;
        }

        return values;
    }

    /**
     * Get a set of values from cache.
     *
     * @param {string[]} keys
     * @param {any[]} defs
     * @param {object} o
     * @param {Boolean} [o.deserialize=true] Return value as JSON
     * @param {Boolean} [o.buffer=false] Get key as binary data
     * @returns {Promise}
     */
    async getBatch(keys, defs = [], o = {}) {

        let { buffer, deserialize } = extend({
            buffer: false,
            deserialize: this.deserialize,
        }, o);

        keys = this.hashKeyBatch(keys);

        /**
         * mget always returns an array.
         * Any key that is not matched to a
         * value then the value will be set to
         * `null`.
         */
        let values = buffer ?
            this.client.mgetBuffer(keys) :
            this.client.mget(keys);

        values = await values;

        const _deserializer = val => {
            if (!deserialize || val == null) return val;
            return typeof deserialize === 'function' ?
                deserialize(val) :
                this.deserialize(val);
        };

        for (const index in values) {
            let value = _deserializer(values[index]);
            if (value === null && (index in defs)) {
                value = defs[index];
            }
            values[index] = value;
        }

        return values;
    }

    setBatch(keys, values, o = {}) {
        if (notValidArguments(keys, values)) throw new CacheClientError('Argument error');

        const { ttl, serialize } = extend({
            ttl: this.defaultTTL,
            serialize: this.serialize,
        }, o);

        keys = this.hashKeyBatch(keys);

        const tx = this.client.multi();

        for (const index in keys) {
            let key = keys[index];
            let value = values[index];
            if (typeof value !== 'string') value = serialize(value);
            tx.set(key, value, this.timeUnit, ttl);
        }

        return tx.exec();
    }

    /**
     * Remove key from cache.
     * @param {Array} keys cache key
     * @returns {Promise}
     */
    delBatch(keys) {
        if (!Array.isArray(keys)) keys = [keys];
        keys = this.hashKeyBatch(keys);
        return this.client.del(keys);
    }

    hashKeyBatch(keys, options = {}) {
        if (!Array.isArray(keys)) throw new CacheClientError('Argument error');
        return keys.map(key => this.hashKey(key, options));
    }

    areHashKeys(keys, options = {}) {
        if (!Array.isArray(keys)) throw new CacheClientError('Argument error');
        return keys.map(key => this.isHashKey(key, options));
    }
}

module.exports = BatchCacheClient;

function notValidArguments(keys, values) {
    if (!Array.isArray(keys) || !Array.isArray(values)) return true;
    if (keys.length === 0 || values.length === 0) return true;
    if (keys.length !== values.length) return true;
    return false;
}


function notEmpty(a = []) {
    return a.filter(a => a != null).length;
}