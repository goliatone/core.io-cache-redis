'use strict';
const test = require('tape');
const sinon = require('sinon');
const CacheClient = require('..').CacheClient;
const noopConsole = require('noop-console');

const fixtures = {};

test('CacheClient: "tryGet" should use fallback when key not in cache', async t => {
    const fallback = _ => expected
    const expected = { user: 1, name: 'pepe' };
    const key = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: function() {
            const Redis = require('ioredis-mock');
            return new Redis();
        }
    });

    const result = await cache.tryGet(key, fallback, {
        addTimestamp: false
    });

    t.equals(result, expected, `result is expected object`);
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
            const Redis = require('ioredis-mock');
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
            const Redis = require('ioredis-mock');
            return new Redis({
                data: {
                    [`cache:${key}`]: JSON.stringify(expected)
                }
            });
        }
    });

    const result = await cache.get(key);

    t.deepEquals(result, expected, `result is expected object`);

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
            const Redis = require('ioredis-mock');
            return new Redis({
                data: {
                    [key]: JSON.stringify(expected)
                }
            });
        }
    });

    const result = await cache.get(key);

    t.deepEquals(result, expected, `result is expected cached value`);

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
            const Redis = require('ioredis-mock');
            return new Redis({
                data: {
                    [`cache:${key}`]: expected
                }
            });
        }
    });

    const result = await cache.get(key, undefined, false);

    t.deepEquals(result, expected, `result is expected string`);

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
            const Redis = require('ioredis-mock');
            return new Redis({ data: {} });
        }
    });

    const result = await cache.get(key, expected);
    console.log('======= result', result);
    t.deepEquals(result, expected, `result is expected object`);

    t.end();
});

test.only('CacheClient: "set" should set a value we can retrieve with "get"', async t => {
    const expected = { user: 1, name: 'pepe' };
    const key = 'cache:6b0fc92e-409e-41d0-87c7-1c5bbcaea54b';

    const cache = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: function() {
            const Redis = require('ioredis-mock');
            return new Redis();
        }
    });

    await cache.set(key, expected);

    const result = await cache.get(key);

    t.deepEquals(result, expected, `result is expected cached value`);

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
            const Redis = require('ioredis-mock');
            return new Redis();
        }
    });

    const set = sinon.stub(cache.client, 'set');

    set.callsFake((key, value, unit, ttl) => {
        t.equals(ttl, defaultTTL, 'should be called with default TTL');
        t.end();
        set.restore();
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
            const Redis = require('ioredis-mock');
            return new Redis();
        }
    });

    const set = sinon.stub(cache.client, 'set');

    set.callsFake((key, value, unit, ttl) => {
        t.equals(ttl, argTTL, 'should be called with TTL argument');
        t.end();
        set.restore();
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
            const Redis = require('ioredis-mock');
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

    t.end();
});

test('CacheClient: isHashKey should identify valid cache keys using default pattern', t => {

    const cache = new CacheClient({
        logger: noopConsole(),
        createClient: function() {
            const Redis = require('ioredis-mock');
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
            const Redis = require('ioredis-mock');
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
            const Redis = require('ioredis-mock');
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
            const Redis = require('ioredis-mock');
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
            const Redis = require('ioredis-mock');
            return new Redis();
        }
    });

    const result = cache.timeUnit;
    t.equals(result, 'PX', `"PX" = "${result}"`);
    t.end();
});