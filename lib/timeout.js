/**
 * This code is a modified version of
 * [p-timeout](https://github.com/sindresorhus/p-timeout).
 *
 * The modification is to prevent module import errors.
 */


class TimeoutError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}

function promiseTimeout(promise, timeout, error, options = {}) {
    const {
        timers = { setTimeout, clearTimeout }
    } = options;

    let timeoutId;

    const cancelable = new Promise((resolve, reject) => {
        if (validateTimeout(timeout) === false) {
            throw new TypeError(`Expected "timeout" to be a positive number, got "${timeout}"`);
        }

        timeoutId = timers.setTimeout(function() {
            reject(makeError(error, timeout));
        }, timeout);

        (async _ => {
            try {
                resolve(await promise);
            } catch (error) {
                reject(error);
            } finally {
                timers.clearTimeout(timeoutId);
            }
        })();
    });

    cancelable.clear = function() {
        timers.clearTimeout(timeoutId);
        timeoutId = undefined;
    };

    return cancelable;
}

function makeError(error, timeout) {
    const errorMessage = typeof error === 'string' ? error : `Promise timed out after ${timeout} milliseconds`;

    return (error instanceof Error) ?
        error :
        new TimeoutError(errorMessage);
}

function validateTimeout(timeout) {
    return typeof timeout === 'number' && Math.sign(timeout) === 1;
}

module.exports = promiseTimeout;
module.exports.makeError = makeError;
module.exports.validateTimeout = validateTimeout;
module.exports.TimeoutError = TimeoutError;