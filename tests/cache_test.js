'use strict';
const test = require('tape');
const sinon = require('sinon');
const CacheClient = require('..').CacheClient;
const noopConsole = require('noop-console');
const Redis = require('ioredis-mock');

const fixtures = {};

test('CacheClient: "tryGet" should use fallback when key not in cache', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        promiseTimeout,
        createClient: function() {
            return new Redis();
        }
    });

    let expectedError;

    try {
        await cache.tryGet(key, _ => expected, {
            timeout,
            addTimestamp: false,
        });
    } catch (error) {
        expectedError = error;
    }

    t.ok(expectedError, 'timeout should generate error');
    t.equals(expectedError.code, 408, 'error should have 408 code');
    t.ok(promiseTimeout.calledOnce, 'cache.promiseTimeout should have been called');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "tryGet" should handle "get" thrown errors', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '9111dbea-51cf-4d98-aae7-bb888610743d';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
    });

    const get = sinon.stub(cache, 'get');
    get.rejects();

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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        promiseTimeout,
        createClient: function() {
            return new Redis();
        }
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


test('CacheClient: "get" should return value', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = '90dc29f8-027b-4fec-a011-ab07af159f5b';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis({ data: {} });
        }
    });

    const result = await cache.get(key, expected);

    t.deepEquals(result, expected, `result is expected object`);

    await cache.client.flushall();

    t.end();
});

test('CacheClient: "set" should set a value we can retrieve with "get"', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:6b0fc92e-409e-41d0-87c7-1c5bbcaea54b';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
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

test('CacheClient: "del" should delete a value', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:13136b36-bbcf-4127-bb03-28038065e9ba';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        createClient: function() {
            return new Redis();
        }
    });

    let keys = [{
        key: 'adfadfa',
        expected: false,
    }, {
        key: '0c19caba-aad2-4e64-b644-a2a546528912',
        expected: false
    }, {
        key: 'cache:0c19caba-aad2-4e64-b644-a2a546528912',
        expected: false
    }, {
        key: 'cache:cfe599a8705981bc9d8cf136591',
        expected: false
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

test('CacheClient: isHashKey should identify valid cache keys using custom pattern', t => {

    const cache = new CacheClient({
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
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
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
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

test('CacheClient: ttl in seconds use EX', t => {
    const cache = new CacheClient({
        ttlInSeconds: true,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
    });

    const result = cache.timeUnit;
    t.equals(result, 'EX', `"EX" = "${result}"`);
    t.end();
});

test('CacheClient: ttl in milliseconds use PX', t => {
    const cache = new CacheClient({
        ttlInSeconds: false,
        logger: noopConsole(),
        createClient: function() {
            return new Redis();
        }
    });

    const result = cache.timeUnit;
    t.equals(result, 'PX', `"PX" = "${result}"`);
    t.end();
});