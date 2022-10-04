export = CacheClient;
declare class CacheClient {
    constructor(config?: {
        autoinitialize: boolean;
        logger: any;
        defaultTTL: number;
        ttlInSeconds: boolean;
        clientConnectionTimeout: number;
        lastError: any;
        createClient: typeof import("./createClient");
        hashKeys: boolean;
        defaultCacheKeyPrefix: string;
        cacheKeyPrefix: string;
        tryGetOptions: {
            deserialize: boolean;
            addTimestamp: boolean;
            throwOnError: boolean;
            forceCacheMiss: boolean;
        };
        cacheKeyMatcher: RegExp;
        hashUUIDs: boolean;
        clientOptions: {
            port: number;
            host: string;
            tls: boolean;
            showFriendlyErrorStack: boolean;
        };
        keySerializer(obj: any): string;
        keyHashFunction(key: any): any;
        serialize(obj: any): string;
        deserialize(value: any): any;
        makeTimestamp(value: any, addTimestamp: any): any;
        hasUUIDFormat(str?: string, strict?: boolean): boolean;
    });
    init(config?: {}): void;
    initialized: boolean;
    errors: any[];
    client: any;
    testConnection(timeout?: any):Promise<any>;
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
    tryGet(key: string, fallback: (key: string) => any, options?: {
        ttl?: number;
        timeout: number;
        deserialize?: Function | boolean;
        serialize?: Function;
        addTimestamp?: boolean;
        throwOnError?: boolean;
        forceCacheMiss?: boolean;
    }): Promise<any>;
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
    get(key: string, def: any, options?: {
        deserialize?: boolean;
        buffer?: boolean;
    }): Promise<any>;
    /**
     * Set a key in cache
     * @param {String} key cache key
     * @param {Object|String} value Value to cache
     * @param {Object} options
     * @param {Int} [options.ttl=this.defaultTTL] Time to live for this key
     * @returns {Promise}
     */
    set(key: string, value: any | string, options?: {
        ttl?: number;
    }): Promise<any>;
    /**
     * Remove key from cache.
     * @param {String} key cache key
     * @param {Object} key cache key
     * @returns {Promise}
     */
    del(key: string): Promise<any>;
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
    hashKey(key: string): string;
    isHashKey(key: any): boolean;
    /**
     * Purge all keys matching the `match` pattern.
     * @example ```js
     * cache.purgeKeys('cache:*');
     * ```
     * @param {String} match Pattern to match
     * @param {Int} count Number of keys per cycle
     * @returns {Promise}
     */
    purgeKeys(match?: string, count?: number): Promise<any>;
    shouldQueryCache(key: any, options?: {}): boolean;
    get timeUnit(): "EX" | "PX";
    handleError(error: any, label?: string): void;
    lastError: any;
}
declare namespace CacheClient {
    export { defaults };
    export const UUID_CACHE_MATCHER: RegExp;
}
import { defaults } from "./defaults";
