export = promiseTimeout;
declare function promiseTimeout(promise: any, timeout: any, error: any, options?: {}): any;
declare namespace promiseTimeout {
    export { validateTimeout, TimeoutError };
}
declare function validateTimeout(timeout: any): boolean;
/**
 * This code is a modified version of
 * [p-timeout](https://github.com/sindresorhus/p-timeout).
 *
 * The modification is to prevent module import errors.
 */
declare class TimeoutError extends Error {
    constructor(message: any, code?: number);
    code: number;
}
