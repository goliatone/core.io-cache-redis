export const init: (context: any, config: any) => any;
export const CacheClient: typeof import("./lib/cache");
export const createClient: typeof import("./lib/createClient");
export const defaults: {
    autoinitialize: boolean;
    logger: any;
    defaultTTL: number;
    ttlInSeconds: boolean;
    clientConnectionTimeout: number;
    lastError: any;
    errors: any[];
    createClient: typeof import("./lib/createClient");
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
};
