'use strict';
const test = require('tape');
const sinon = require('sinon');
const CacheClient = require('../lib/cache');
const { CacheClientError } = require('../lib/errors');
const { UUID_CACHE_MATCHER } = require('..');
const noopConsole = require('noop-console');
const Redis = require('ioredis-mock');

test('CacheClient: "tryGet" should use fallback when key not in cache', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const fallback = sinon.stub();
    fallback.returns(expected);

    const result = await cache.tryGet(key, fallback, {
        addTimestamp: false
    });

    t.equals(result, expected, `result is expected object`);
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(key), 'fallback should have been with raw key');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should use cache when key is found', async t => {
    const fallback = sinon.spy();
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const result = await cache.tryGet(key, fallback, {
        addTimestamp: false
    });

    t.deepEquals(result, expected, `result is expected value`);
    t.ok(fallback.notCalled, 'fallback should not be called');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should skip cache if "shouldQueryCache" returns `false`', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        shouldQueryCache(key, options) {
            return false;
        },
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const fallback = sinon.stub();
    fallback.returns(expected);

    const get = sinon.spy(cache, 'get');

    const result = await cache.tryGet(key, fallback, {
        addTimestamp: false
    });

    t.deepEquals(result, expected, `result is expected value`);

    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(get.notCalled, 'cache.get should not have been called');

    get.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" call fallback if "forceCacheMiss" is `true`', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const fallback = sinon.stub();
    fallback.returns(expected);

    const get = sinon.spy(cache, 'get');

    const result = await cache.tryGet(key, fallback, {
        forceCacheMiss: true,
    });

    t.deepEquals(result, expected, `result is expected value`);

    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(get.notCalled, 'cache.get should not have been called');

    get.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should use cache if "forceCacheMiss" is `false`', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const fallback = sinon.stub();
    fallback.returns(expected);

    const get = sinon.spy(cache, 'get');

    const result = await cache.tryGet(key, fallback, {
        forceCacheMiss: false,
    });

    t.deepEquals(result, expected, `result is expected value`);

    t.ok(get.calledOnce, 'get should have been called once');

    get.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should call fallback if "forceCacheMiss" function returns `true`', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';

    let calledOnce = false;
    const forceCacheMiss = (cacheKey, options) => {
        calledOnce = true;
        return true;
    };

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const fallback = sinon.stub();
    fallback.returns(expected);

    const get = sinon.spy(cache, 'get');

    const result = await cache.tryGet(key, fallback, {
        forceCacheMiss,
    });

    t.deepEquals(result, expected, `result is expected value`);

    t.ok(calledOnce, 'forceCacheMiss should have been called');
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(get.notCalled, 'cache.get should not have been called');

    get.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should call "makeTimestamp" when `addTimestamp=true`', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';
    const addTimestamp = true;

    const cache = new CacheClient({
        logger: noopConsole(),
        shouldQueryCache(key, options) {
            return false;
        },
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const fallback = key => expected;

    const makeTimestamp = sinon.spy(cache, 'makeTimestamp');

    const result = await cache.tryGet(key, fallback, {
        addTimestamp
    });

    t.ok(makeTimestamp.calledOnce, 'makeTimestamp should have been called once');
    t.true(!!result._cachedOn, 'makeTimestamp should add a _cachedOn attribute');
    t.ok(makeTimestamp.calledWith(expected, addTimestamp), 'makeTimestamp have been called with expected arguments');

    makeTimestamp.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should not call "makeTimestamp" when `addTimestamp=false`', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';
    const addTimestamp = false;

    const cache = new CacheClient({
        logger: noopConsole(),
        shouldQueryCache(key, options) {
            return false;
        },
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const fallback = key => expected;

    const makeTimestamp = sinon.spy(cache, 'makeTimestamp');

    const result = await cache.tryGet(key, fallback, {
        addTimestamp
    });

    t.ok(makeTimestamp.calledOnce, 'makeTimestamp should have been called once');
    t.false(!!result._cachedOn, 'makeTimestamp should not add a _cachedOn attribute');
    t.ok(makeTimestamp.calledWith(expected, addTimestamp), 'makeTimestamp have been called with expected arguments');

    makeTimestamp.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should handle "promiseTimeout" thrown errors', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'd768cd7e-e95f-4675-b561-1c4923293d08';
    const timeout = 1000;

    const promiseTimeout = sinon.stub();
    promiseTimeout.throwsArg(2);

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        promiseTimeout,
        createClient: () => new Redis()
    });

    const handleError = sinon.stub(cache, 'handleError');

    let expectedError;

    try {
        await cache.tryGet(key, _ => expected, {
            timeout,
            addTimestamp: false,
        });
    } catch (error) {
        expectedError = error;
    }

    t.ok(expectedError instanceof CacheClientError, 'timeout should throw error');
    t.equals(expectedError.code, 408, 'error should have 408 code');
    t.ok(promiseTimeout.calledOnce, 'cache.promiseTimeout should have been called');
    t.ok(handleError.calledOnce, 'cache.handleError should have been called');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should handle "get" thrown errors', async t => {
    const key = 'd768cd7e-e95f-4675-b561-1c4923293d08';
    const timeout = 1000;

    const expected = new Error();

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const get = sinon.stub(cache.client, 'get');
    get.throws(expected);

    const handleError = sinon.stub(cache, 'handleError');

    let expectedError;

    try {
        await cache.tryGet(key, _ => undefined, {
            timeout,
            throwOnError: true,
        });
    } catch (error) {
        expectedError = error;
    }

    t.equals(expectedError, expected, 'timeout should throw error');
    t.ok(get.calledOnce, 'cache.promiseTimeout should have been called');
    t.ok(handleError.calledOnce, 'cache.handleError should have been called');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should handle "get" returned errors', async t => {
    const key = 'd768cd7e-e95f-4675-b561-1c4923293d08';
    const timeout = 1000;

    const expected = new Error();

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const get = sinon.stub(cache.client, 'get');
    get.throws(expected);

    const handleError = sinon.stub(cache, 'handleError');

    let expectedError, result;

    try {
        result = await cache.tryGet(key, _ => undefined, {
            timeout,
            throwOnError: false,
        });
    } catch (error) {
        expectedError = error;
    }

    t.equals(expectedError, undefined, 'timeout should not throw error');
    t.equals(result.$error, expected, 'timeout should return error');
    t.ok(get.calledOnce, 'cache.promiseTimeout should have been called');
    t.ok(handleError.calledOnce, 'cache.handleError should have been called');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" "promiseTimeout" should throw errors if throwOnError true', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'd768cd7e-e95f-4675-b561-1c4923293d08';
    const timeout = 1000;

    const promiseTimeout = sinon.stub();
    promiseTimeout.throws(new CacheClientError('test', 500));

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        promiseTimeout,
        createClient: () => new Redis()
    });

    let expectedError, result;

    try {
        result = await cache.tryGet(key, _ => expected, {
            timeout,
            throwOnError: true,
        });
    } catch (error) {
        expectedError = error;
    }

    t.ok(expectedError instanceof CacheClientError, 'timeout should throw error');
    t.equals(expectedError.code, 500, 'error should have 500 code');
    t.notOk(result, 'result should be undefined');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should return errors if `throwOnError=false`', async t => {
    const key = 'd768cd7e-e95f-4675-b561-1c4923293d08';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const actualError = new Error();

    const fallback = sinon.stub();
    fallback.throws(actualError);

    let expectedError, result;

    try {
        result = await cache.tryGet(key, fallback, {
            throwOnError: false,
        });
    } catch (error) {
        expectedError = error;
    }

    t.notOk(expectedError, 'should not throw error');
    t.ok(fallback.calledOnce, 'fallback should have been called');
    t.ok(result, 'should return a value');
    t.ok(result.$error, 'should return error');
    t.equals(result.$error, actualError, 'should return error');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should handle "get" thrown errors', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '9111dbea-51cf-4d98-aae7-bb888610743d';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const get = sinon.stub(cache, 'get');
    get.rejects();

    const handleError = sinon.stub(cache, 'handleError');

    let expectedError;

    try {
        await cache.tryGet(key, _ => expected, {
            throwOnError: true,
        });
    } catch (error) {
        expectedError = error;
    }

    t.ok(expectedError, 'get should generate error');
    t.ok(get.calledOnce, 'cache.get should have been called');
    t.ok(handleError.calledOnce, 'cache.handleError should have been called');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should call "promiseTimeout" if timeout is set', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '62dd0765-ad4b-4c65-b7a1-6a82c07da45a';
    const timeout = 1000;

    const promiseTimeout = sinon.stub();
    promiseTimeout.returns(expected);

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        promiseTimeout,
        createClient: () => new Redis()
    });

    const fallback = sinon.stub();
    fallback.returns(expected);

    const result = await cache.tryGet(key, fallback, {
        timeout,
        addTimestamp: false,
    });

    t.deepEquals(result, expected, `result is expected value`);

    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(promiseTimeout.calledOnce, 'cache.promiseTimeout should have been called');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should return empty values', async t => {
    const expected = undefined;
    const key = '62dd0765-ad4b-4c65-b7a1-6a82c07da45a';


    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const fallback = sinon.stub();
    fallback.returns(expected);

    const set = sinon.spy(cache, 'set');

    const result = await cache.tryGet(key, fallback, {
        addTimestamp: false,
    });

    t.deepEquals(result, expected, `result is expected value`);
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(set.notCalled, 'set should have been called once');

    set.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClient: "get" should return value', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '90dc29f8-027b-4fec-a011-ab07af159f5b';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const result = await cache.get(key);

    t.deepEquals(result, expected, `result is expected object`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "get" should return value if we use full key', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:4b4509b7-9844-48a8-9906-16f9189fc547';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [key]: JSON.stringify(expected)
                }
            });
        }
    });

    const result = await cache.get(key);

    t.deepEquals(result, expected, `result is expected cached value`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "get" should return string if "deserialize" is `false`', async t => {
    const expected = `{ user: 1, name: 'pepe' }`;
    const key = '0dffa433-5b80-4ef4-ba73-085e22a0f030';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: expected
                }
            });
        }
    });

    const result = await cache.get(key, undefined, false);

    t.deepEquals(result, expected, `result is expected string`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "get" should return default value if key not found', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '872e3fc6-a9b3-4412-a25f-0750bf14ab10';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({ data: {} });
        }
    });

    const result = await cache.get(key, expected);

    t.deepEquals(result, expected, `result is default value object`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "get" should handle deserialize boolean values', async t => {
    const expectedObject = { user: 1, name: 'pepe' };
    const expected = JSON.stringify(expectedObject);
    const key = '872e3fc6-a9b3-4412-a25f-0750bf14ab10';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: expected
                }
            });
        }
    });

    let result = await cache.get(key, undefined, false);

    t.deepEquals(result, expected, `result should be string`);

    result = await cache.get(key, undefined, true);

    t.deepEquals(result, expectedObject, `result should be object`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "get" should handle deserialize as object values', async t => {
    const expectedObject = { user: 1, name: 'pepe' };
    const expected = JSON.stringify(expectedObject);
    const key = '872e3fc6-a9b3-4412-a25f-0750bf14ab10';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: expected
                }
            });
        }
    });

    let result = await cache.get(key, undefined, { deserialize: false });

    t.deepEquals(result, expected, `result should be string`);

    result = await cache.get(key, undefined, { deserialize: true });

    t.deepEquals(result, expectedObject, `result should be object`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "set" should set a value we can retrieve with "get"', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:6b0fc92e-409e-41d0-87c7-1c5bbcaea54b';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    await cache.set(key, expected);

    const result = await cache.get(key);

    t.deepEquals(result, expected, `result is expected cached value`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "set" should use a default TTL value', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:7e2b336f-a2db-4249-a2ea-164acc3a8b56';
    const defaultTTL = 100;

    const cache = new CacheClient({
        defaultTTL,
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const set = sinon.stub(cache.client, 'set');

    set.callsFake(async(key, value, unit, ttl) => {
        t.equals(ttl, defaultTTL, 'should be called with default TTL');
        set.restore();
        await cache.client.flushall();
        t.end();
    });

    await cache.set(key, expected);
});

test('CacheClient: "set" should use given TTL argument', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:7e2b336f-a2db-4249-a2ea-164acc3a8b56';
    const argTTL = 100;

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const set = sinon.stub(cache.client, 'set');

    set.callsFake(async(key, value, unit, ttl) => {
        t.equals(ttl, argTTL, 'should be called with TTL argument');
        set.restore();
        await cache.client.flushall();
        t.end();
    });

    await cache.set(key, expected, argTTL);
});

test('CacheClient: "set" should use "serialize" function for object values', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:7e2b336f-a2db-4249-a2ea-164acc3a8b56';
    const argTTL = 100;

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const set = sinon.stub(cache.client, 'set');
    const serialize = sinon.spy(cache, 'serialize');

    set.callsFake(async(key, value, unit, ttl) => {
        t.equals(ttl, argTTL, 'should be called with TTL argument');
        t.ok(serialize.calledOnce, 'should deserialize object');
        set.restore();

        await cache.client.flushall();

        t.end();
    });

    await cache.set(key, expected, argTTL);
});

test('CacheClient: "get" and "set" should handle custom serialize and deserialize functions', async t => {

    const expected = { user: 1, name: 'pepe' };
    const key = '872e3fc6-a9b3-4412-a25f-0750bf14ab10';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {}
            });
        }
    });

    await cache.set(key, expected, {
        serialize: record => {
            //eyJ1c2VyIjoxLCJuYW1lIjoicGVwZSJ9
            return Buffer.from(JSON.stringify(record)).toString('base64');
        }
    });

    let result = await cache.get(key, undefined, {
        deserialize: raw => {
            return JSON.parse(Buffer.from(raw, 'base64').toString());
        }
    });

    t.deepEquals(result, expected, `result should be object`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "get" and "set" should handle buffer data', async t => {

    const expected = { user: 1, name: 'pepe' };
    const bufferData = Buffer.from(JSON.stringify(expected));

    const key = '872e3fc6-a9b3-4412-a25f-0750bf14ab10';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {}
            });
        }
    });

    await cache.set(key, bufferData);

    /**
     * NOTE: ioredis-mock behavior for `getBuffer`
     * seem broken. `set` stores an object with
     * type and data attributes and `getBuffer`
     * does not decode as it should
     */
    cache.client.getBuffer = _ => bufferData;

    let result = await cache.get(key, undefined, {
        buffer: true
    });

    t.deepEquals(result, expected, `result should be object`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "del" should delete a value', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:13136b36-bbcf-4127-bb03-28038065e9ba';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({
                data: {
                    [key]: JSON.stringify(expected)
                }
            });
        }
    });

    let result = await cache.get(key);

    t.deepEquals(result, expected, `result is expected cached value`);

    await cache.del(key);

    result = await cache.get(key);

    t.notOk(result, 'After delete we should not find key');

    await cache.client.flushall();
    t.end();
});

test('CacheClient: isHashKey should identify valid cache keys using default pattern', t => {

    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    let keys = [{
        key: 'getAllRecords:[0-100]',
        expected: false,
    }, {
        key: '0c19caba-aad2-4e64-b644-a2a546528912',
        expected: false
    }, {
        key: 'cache:0c19caba-aad2-4e64-b644-a2a546528912',
        expected: true
    }, {
        key: 'cache:cfe599a8705981bc9d8cf136591',
        expected: true
    }, {
        key: 'cache:cfe599a8705981bc9d8cf136591e66bf',
        expected: true
    }, {
        key: 'cache:4f56edcb1558d4df2f77295f86059006',
        expected: true
    }, {
        key: 'cache:4F56EDCB1558D4DF2F77295F86059006',
        expected: true
    }];

    keys.forEach(fixture => {
        const result = cache.isHashKey(fixture.key);
        t.equals(result, fixture.expected, `is "${fixture.key}" a hash hey? ${result}`);
    });

    t.end();
});

test('CacheClient: isHashKey should use keySerializer for non string keys', t => {

    const keySerializer = obj => obj.id;

    const cache = new CacheClient({
        keySerializer,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    let keys = [{
        keyObject: { id: 'MWMxNTNlNzMzMzNmOGM0YWMwNDg3NGM1NjQ0MzEzNjQ=' },
        expected: false,
    }, {
        keyObject: { id: '0c19caba-aad2-4e64-b644-a2a546528912' },
        expected: false
    }, {
        keyObject: { id: 'cache:0c19caba-aad2-4e64-b644-a2a546528912' },
        expected: true
    }, {
        keyObject: { id: 'cache:cfe599a8705981bc9d8cf136591' },
        expected: true
    }, {
        keyObject: { id: 'cache:cfe599a8705981bc9d8cf136591e66bf' },
        expected: true
    }, {
        keyObject: { id: 'cache:4f56edcb1558d4df2f77295f86059006' },
        expected: true
    }, {
        keyObject: { id: 'cache:4F56EDCB1558D4DF2F77295F86059006' },
        expected: true
    }];

    keys.forEach(fixture => {
        const result = cache.isHashKey(fixture.keyObject);
        t.equals(result, fixture.expected, `is "${fixture.keyObject.id}" a hash hey? ${result}`);
    });

    t.end();
});

test('CacheClient: isHashKey should identify valid cache keys using custom pattern', t => {

    const cache = new CacheClient({
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    let keys = [{
        key: 'adfadfa',
        expected: false,
    }, {
        key: '0c19caba-aad2-4e64-b644-a2a546528912',
        expected: false
    }, {
        key: 'cache:0c19caba-aad2-4e64-b644-a2a546528912',
        expected: true
    }, {
        key: 'cache:cfe599a8705981bc9d8cf136591',
        expected: false
    }, {
        key: 'cache:cfe599a8705981bc9d8cf136591e66bf',
        expected: false
    }, {
        key: 'cache:4998c5a8-461f-44f7-9c2d-bb5ce3bbff91',
        expected: true
    }, {
        key: 'cache:425b01ac-4c45-49ef-b3a0-3fcf64a4d116',
        expected: true
    }, {
        key: 'cache:user:425b01ac-4c45-49ef-b3a0-3fcf64a4d116',
        expected: true
    }, {
        key: 'cache:user:profile:425b01ac-4c45-49ef-b3a0-3fcf64a4d116',
        expected: true
    }];

    keys.forEach(fixture => {
        const result = cache.isHashKey(fixture.key);
        t.equals(result, fixture.expected, `is "${fixture.key}" a hash hey? ${result}`);
    });

    t.end();
});

test('CacheClient: hashKey should not hash UUIDs', t => {

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    let keys = [{
        key: 'adfadfa',
        expected: 'cache:9c9003d48dc9a1ee2bd97749db6c7cc7',
    }, {
        key: '0c19caba-aad2-4e64-b644-a2a546528912',
        expected: 'cache:0c19caba-aad2-4e64-b644-a2a546528912'
    }, {
        key: 'cache:0c19caba-aad2-4e64-b644-a2a546528912',
        expected: 'cache:0c19caba-aad2-4e64-b644-a2a546528912'
    }, {
        key: 'sample-raw-key',
        expected: 'cache:69d9380fbea522ce22fa5bc88be74a8a'
    }];

    keys.forEach(fixture => {
        const result = cache.hashKey(fixture.key);
        t.equals(result, fixture.expected, `"${fixture.key}" = "${result}"`);
    });

    t.end();
});

test('CacheClient: hashKey should not hash keys if hashKeys is false', t => {

    const cache = new CacheClient({
        hashKeys: false,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    let keys = [{
        key: 'adfadfa',
        expected: 'adfadfa',
    }, {
        key: '0c19caba-aad2-4e64-b644-a2a546528912',
        expected: '0c19caba-aad2-4e64-b644-a2a546528912'
    }, {
        key: '0c19caba-aad2-4e64-b644-a2a546528912',
        expected: '0c19caba-aad2-4e64-b644-a2a546528912'
    }, {
        key: 'sample-raw-key',
        expected: 'sample-raw-key'
    }];

    keys.forEach(fixture => {
        const result = cache.hashKey(fixture.key);
        t.equals(result, fixture.expected, `"${fixture.key}" = "${result}"`);
    });

    t.end();
});

test('CacheClient: hashKey should call "keySerializer" if key is not string', t => {
    const keySerializer = o => o.id;

    const cache = new CacheClient({
        keySerializer,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    let keys = [{
        key: { id: 'adfadfa' },
        expected: 'cache:9c9003d48dc9a1ee2bd97749db6c7cc7',
    }, {
        key: { id: '0c19caba-aad2-4e64-b644-a2a546528912' },
        expected: 'cache:5912e5637aa512a20cce8ed0ad43ef6a'
    }, {
        key: { id: 'cache:43d380b9ba948d74b19e4b7164e057a1' },
        expected: 'cache:43d380b9ba948d74b19e4b7164e057a1'
    }, {
        key: { id: 'sample-raw-key' },
        expected: 'cache:69d9380fbea522ce22fa5bc88be74a8a'
    }];


    keys.forEach(fixture => {
        const result = cache.hashKey(fixture.key);
        t.equals(result, fixture.expected, `"${fixture.key.id}" = "${result}"`);
    });

    t.end();
});

test('CacheClient: ttl in seconds use EX', t => {
    const cache = new CacheClient({
        ttlInSeconds: true,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const result = cache.timeUnit;
    t.equals(result, 'EX', `"EX" = "${result}"`);
    t.end();
});

test('CacheClient: ttl in milliseconds use PX', t => {
    const cache = new CacheClient({
        ttlInSeconds: false,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const result = cache.timeUnit;
    t.equals(result, 'PX', `"PX" = "${result}"`);
    t.end();
});

test('CacheClient: "get" errors should be handled by "handleError"', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '9111dbea-51cf-4d98-aae7-bb888610743d';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const get = sinon.stub(cache, 'get');
    get.rejects();

    const handleError = sinon.spy(cache, 'handleError');

    let expectedError;

    try {
        await cache.tryGet(key, _ => expected, {
            throwOnError: true,
        });
    } catch (error) {
        expectedError = error;
    }

    t.ok(handleError.calledOnce, 'cache.handleError should have been called');
    t.ok(handleError.calledWith(expectedError), 'cache.handleError called with error');
    t.deepEquals(cache.lastError, expectedError, 'cache stores last error');
    t.equals(cache.errors.length, 1, 'should store errors in array');

    await cache.client.flushall();
    handleError.restore();

    t.end();
});

test('CacheClient: "set" errors should be handled by "handleError"', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '9111dbea-51cf-4d98-aae7-bb888610743d';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const set = sinon.stub(cache, 'set');
    set.rejects();

    const handleError = sinon.spy(cache, 'handleError');

    let expectedError;

    try {
        await cache.tryGet(key, _ => expected, {
            throwOnError: true,
        });
    } catch (error) {
        expectedError = error;
    }

    t.ok(handleError.calledOnce, 'cache.handleError should have been called');
    t.ok(handleError.calledWith(expectedError), 'cache.handleError called with error');
    t.deepEquals(cache.lastError, expectedError, 'cache stores last error');
    t.equals(cache.errors.length, 1, 'should store errors in array');

    await cache.client.flushall();
    handleError.restore();

    t.end();
});

test('CacheClient: `throwOnError=false` should return error value', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '9111dbea-51cf-4d98-aae7-bb888610743d';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const actualError = new Error();

    const set = sinon.stub(cache, 'set');
    set.rejects(actualError);

    let expectedError, result;

    try {
        result = await cache.tryGet(key, _ => expected, {
            throwOnError: false,
        });
    } catch (error) {
        expectedError = error;
    }

    t.notOk(expectedError, 'should not throw an error');
    t.ok(result, 'should return a value');
    t.ok(result.$error, 'should return error');
    t.equals(result.$error, actualError, 'should return error');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: `testConnection` should throw error if we fail to connect', async t => {
    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const delay = t => new Promise(resolve => setTimeout(resolve, t));
    cache.client.ping = _ => delay(500);

    let expectedError;

    try {
        await cache.testConnection(5);
    } catch (error) {
        expectedError = error;
    }

    t.ok(expectedError, 'should throw an error on timeout');
    t.ok(expectedError instanceof CacheClientError, 'should throw CacheClientError');
    await cache.client.flushall();

    t.end();
});

test('CacheClient: `purgeKeys` should fix default cache prefix for purge keys', async t => {
    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const expected = `${cache.defaultCacheKeyPrefix}*`;

    cache.client.scanStream = ({ match, count }) => {
        t.equals(match, expected, 'should ensure pattern has wild card');
        return { on: _ => {} };
    };

    const pipeline = sinon.stub(cache.client, 'pipeline');

    cache.purgeKeys();

    await cache.client.flushall();

    t.end();
});

test('CacheClient: `purgeKeys` should purge keys', async t => {
    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const keys = ['one', 'two', 'three'];

    const fakeStream = {
        on: (event, callback) => {
            fakeStream[event] = callback;
        }
    };


    const fakePipeline = {
        del: _ => {},
        exec: _ => {},
    };

    const del = sinon.stub(fakePipeline, 'del');
    const exec = sinon.stub(fakePipeline, 'exec');

    cache.client.scanStream = ({ match, count }) => {
        t.equals(match, 'key', 'should ensure pattern has wild card');
        t.equals(count, 1, 'should match count');
        return fakeStream;
    };

    cache.client.pipeline = _ => fakePipeline;

    let result = cache.purgeKeys('key', 1);

    fakeStream.data(keys);
    t.equals(del.callCount, keys.length, 'should delete all keys');
    t.equals(exec.callCount, 1, 'should paginate pipeline');

    fakeStream.end();
    t.equals(exec.callCount, 2, 'should flush pipeline');

    result = await result;

    t.equals(result.match, 'key', 'should return match');
    t.equals(result.total, 3, 'should return total');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: `purgeKeys` error should call handleError', async t => {
    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const fakeStream = {
        on: (event, callback) => {
            fakeStream[event] = callback;
        }
    };

    const handleError = sinon.stub(cache, 'handleError');

    const fakePipeline = {
        del: _ => {},
        exec: _ => {},
    };

    cache.client.scanStream = _ => {
        return fakeStream;
    };

    cache.client.pipeline = _ => fakePipeline;

    let result = cache.purgeKeys('key', 1);

    const expected = new Error();
    fakeStream.error(expected);

    try {
        await result;
    } catch (error) {
        t.equals(error, expected, 'should throw error');
    }

    t.ok(handleError.calledWith(expected), 'error should match');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should respect tryGetOptions', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '54b798c8-2107-4641-817d-9a5212632c37';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        tryGetOptions: {
            addTimestamp: false,
            throwOnError: true,
            forceCacheMiss: true,
        },
        createClient: function() {
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    let params;
    const _old = cache.shouldQueryCache;
    cache.shouldQueryCache = (key, options) => {
        params = options;
        return _old(key, options);
    };

    const fallback = sinon.stub();
    fallback.returns(expected);

    const result = await cache.tryGet(key, fallback, {
        forceCacheMiss: false,
    });


    t.deepEquals(result, expected, `result is expected value`);

    t.equal(params.addTimestamp, false, 'should set addTimestamp');
    t.equal(params.throwOnError, true, 'should set throwOnError');
    t.equal(params.forceCacheMiss, false, 'should set forceCacheMiss');

    await cache.client.flushall();

    t.end();
});