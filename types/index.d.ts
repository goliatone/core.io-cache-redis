export const init: (context: any, config: any) => any;
export const CacheClient: typeof import("./lib/cache");
export const CacheClientBatch: typeof import("./lib/cacheBatch");
export const CacheClientError: typeof import("./lib/errors").CacheClientError;
export const createClient: typeof import("./lib/createClient");
export const UUID_CACHE_MATCHER: RegExp;
