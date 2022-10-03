export namespace defaults {
    export const autoinitialize: boolean;
    export const logger: any;
    export { _24_hours as defaultTTL };
    export const ttlInSeconds: boolean;
    export { _5_seconds as clientConnectionTimeout };
    export const lastError: any;
    export const errors: any[];
    export { createClient };
    export const hashKeys: boolean;
    export { defaultCacheKeyPrefix };
    export { defaultCacheKeyPrefix as cacheKeyPrefix };
    export namespace tryGetOptions {
        const deserialize: boolean;
        const addTimestamp: boolean;
        const throwOnError: boolean;
        const forceCacheMiss: boolean;
    }
    export const cacheKeyMatcher: RegExp;
    export const hashUUIDs: boolean;
    export namespace clientOptions {
        const port: number;
        const host: string;
        const tls: boolean;
        const showFriendlyErrorStack: boolean;
    }
    /**
     * Stringify raw key objects.
     * @param {Object} obj Raw key
     * @returns {string} Serialized key
     */
    export function keySerializer(obj: any): string;
    export function keyHashFunction(key: any): any;
    export function serialize(obj: any): string;
    export function deserialize(value: any): any;
    export function makeTimestamp(value: any, addTimestamp: any): any;
    /**
     * If `strict` is true then we use a
     * regular expression for compatible with
     * the RFC4122.
     *
     * @param {String} str
     * @param {Boolean} [strict=false]
     * @returns {Boolean}
     */
    export function hasUUIDFormat(str?: string, strict?: boolean): boolean;
    /**
     * If `strict` is true then we use a
     * regular expression for compatible with
     * the RFC4122.
     *
     * @param {String} str
     * @param {Boolean} [strict=false]
     * @returns {Boolean}
     */
    export function hasUUIDFormat(str?: string, strict?: boolean): boolean;
}
declare const _24_hours: number;
declare const _5_seconds: number;
import createClient = require("./createClient");
declare const defaultCacheKeyPrefix: "cache:";
export {};
