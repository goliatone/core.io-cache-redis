export = BatchCacheClient;
declare class BatchCacheClient extends CacheClient {
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
    tryGetBatch(keys: Array<string>, fallback: (keys: string[]) => any, options?: GetBatchOptions): Promise<any>;
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
    getBatch(keys: string[], defs?: any[], o?: {
        deserialize?: boolean;
        buffer?: boolean;
    }): Promise<any>;
    setBatch(keys: any, values: any, o?: {}): any;
    /**
     * Remove key from cache.
     * @param {Array} keys cache key
     * @returns {Promise}
     */
    delBatch(keys: any[]): Promise<any>;
    hashKeyBatch(keys: any, options?: {}): string[];
    areHashKeys(keys: any, options?: {}): boolean[];
}
declare namespace BatchCacheClient {
    export { GetBatchOptions };
}
import CacheClient = require("./cache");
/**
 * Options for tryGetBatch
 */
type GetBatchOptions = {
    /**
     * TTL for this key
     */
    ttl?: Int;
    /**
     * Timeout in milliseconds for fallback function
     */
    timeout: Int;
    /**
     * Retrieve content as JSON
     */
    deserialize?: Function;
    /**
     * Include a timestamp to payload
     */
    addTimestamp?: boolean;
    /**
     * Throw if fallback errors
     */
    throwOnError?: boolean;
    /**
     * Throw if fallback errors
     */
    forceCacheMiss?: boolean;
};
