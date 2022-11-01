'use strict';
const test = require('tape');
const sinon = require('sinon');
const CacheClientBatch = require('../lib/cacheBatch');
const { UUID_CACHE_MATCHER } = require('..');
const { CacheClientError } = require('../lib/errors');
const noopConsole = require('noop-console');
const Redis = require('ioredis-mock');

test('CacheClientBatch: "tryGetBatch" should use fallback when key not in cache', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const result = await cache.tryGetBatch(keys, fallback, {
        addTimestamp: false
    });

    t.deepEquals(result, expected, `result is expected object`);
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(keys), 'fallback should have been with raw key');

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should "setBatch" for keys not in cache', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const setBatch = sinon.spy(cache, 'setBatch');

    const result = await cache.tryGetBatch(keys, fallback, {
        addTimestamp: false
    });

    t.deepEquals(result, expected, `result is expected object`);
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(keys), 'fallback should have been with raw key');
    t.ok(setBatch.calledWith(keys, expected), 'setBatch should have been called');

    setBatch.restore();
    await cache.client.flushall();

    t.end();
});


test('CacheClientBatch: "tryGetBatch" should "setBatch" for some keys not in cache', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis({
            data: {
                [`cache:${key1}`]: JSON.stringify(user1)
            }
        })
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const setKeys = [key2, key3];
    const setValues = [user2, user3];

    const fallback = sinon.stub();
    fallback.returns(setValues);

    const setBatch = sinon.spy(cache, 'setBatch');

    const result = await cache.tryGetBatch(keys, fallback, {
        addTimestamp: false
    });

    t.deepEquals(result, expected, `result is expected object`);
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(setKeys), 'fallback should have been with raw key');
    t.ok(setBatch.calledWith(setKeys, setValues), 'setBatch should have been called');

    setBatch.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should use "promiseTimeout" if timeout is set', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const promiseTimeout = sinon.spy(cache, 'promiseTimeout');

    const result = await cache.tryGetBatch(keys, fallback, {
        timeout: 1000,
    });

    t.deepEquals(result, expected, `result is expected object`);
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(keys), 'fallback should have been with raw key');
    t.ok(promiseTimeout.calledOnce, 'promise timeout should have been called');

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should use "promiseTimeout" should throw 408', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const promiseTimeout = sinon.stub(cache, 'promiseTimeout');
    promiseTimeout.throws({ code: 500 });

    let result, actualError;

    try {
        result = await cache.tryGetBatch(keys, fallback, {
            timeout: 1000,
            throwOnError: true,
        });
    } catch (error) {
        actualError = error;
    }

    t.notOk(result, `result is undefined`);
    t.ok(actualError, 'promiseTimeout should throw');

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should use "promiseTimeout" return error value', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const expectedError = new Error();
    const promiseTimeout = sinon.stub(cache, 'promiseTimeout');
    promiseTimeout.throws(expectedError);

    let actualError, result;

    try {
        result = await cache.tryGetBatch(keys, fallback, {
            timeout: 1000,
            throwOnError: false,
        });
    } catch (error) {
        actualError = error;
    }

    t.ok(result, `result is defined`);
    t.notOk(actualError, 'should not throw error');
    t.equals(result.$error, expectedError, 'promiseTimeout returns error value');

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should handle "setBatch" errors', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    let actualError;
    const expectedError = new Error();
    const setBatch = sinon.stub(cache, 'setBatch');
    setBatch.throws(expectedError);

    let result;

    try {
        result = await cache.tryGetBatch(keys, fallback, {
            throwOnError: true
        });
    } catch (error) {
        actualError = error;
    }

    t.notOk(result, `result should be undefined`);
    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(keys), 'fallback should have been with raw key');
    t.ok(setBatch.calledWith(keys, expected), 'setBatch should have been called');
    t.equals(actualError, expectedError, 'should handle thrown errors');

    setBatch.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should return error value from "setBatch" error', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    let actualError;
    const expectedError = new Error();
    const setBatch = sinon.stub(cache, 'setBatch');
    setBatch.throws(expectedError);

    let result;

    try {
        result = await cache.tryGetBatch(keys, fallback, {
            throwOnError: false
        });
    } catch (error) {
        actualError = error;
    }

    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(keys), 'fallback should have been with raw key');
    t.ok(setBatch.calledWith(keys, expected), 'setBatch should have been called');
    t.equals(result.$error, expectedError, 'should handle thrown errors');

    setBatch.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should return error value from "setBatch" error', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    let actualError;
    const expectedError = new Error();
    const setBatch = sinon.stub(cache, 'setBatch');
    setBatch.throws(expectedError);

    let result;

    try {
        result = await cache.tryGetBatch(keys, fallback, {
            throwOnError: false
        });
    } catch (error) {
        actualError = error;
    }

    t.ok(fallback.calledOnce, 'fallback should have been called once');
    t.ok(fallback.calledWith(keys), 'fallback should have been with raw key');
    t.ok(setBatch.calledWith(keys, expected), 'setBatch should have been called');
    t.equals(result.$error, expectedError, 'should handle thrown errors');

    setBatch.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should add _cachedOn timestamp to record', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const result = await cache.tryGetBatch(keys, fallback, {
        addTimestamp: true
    });

    for (const user of result) {
        console.log(user);
        t.ok(user._cachedOn, 'should have cache');
    }

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should add _cachedOn timestamp to record', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const result = await cache.tryGetBatch(keys, fallback, {
        addTimestamp: true
    });

    for (const user of result) {
        console.log(user);
        t.ok(user._cachedOn, 'should have cache');
    }

    await cache.client.flushall();

    t.end();
});


test('CacheClientBatch: "tryGetBatch" should add cachedOn timestamp to legacy records', async t => {
    const user1 = { user: 1, name: 'user1', cachedOn: Date.now() };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2', cachedOn: Date.now() };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3', cachedOn: Date.now() };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const result = await cache.tryGetBatch(keys, fallback, {
        addTimestamp: true
    });

    for (const user of result) {
        console.log(user);
        t.ok(user.cachedOn, 'should have cache');
    }

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "tryGetBatch" should return keys from cache', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis({
            data: {
                [`cache:${key1}`]: JSON.stringify(user1),
                [`cache:${key2}`]: JSON.stringify(user2),
                [`cache:${key3}`]: JSON.stringify(user3),
            }
        })
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const fallback = sinon.stub();
    fallback.returns(expected);

    const getBatch = sinon.spy(cache, 'getBatch');

    const result = await cache.tryGetBatch(keys, fallback, {
        addTimestamp: false
    });

    t.deepEquals(result, expected, `result is expected object`);
    t.ok(fallback.notCalled, 'fallback should not have been called');
    t.ok(getBatch.calledOnce, 'getBatch should not have been called');

    getBatch.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "getBatch" should return default values for things not in cache', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis({
            data: {
                [`cache:${key1}`]: JSON.stringify(user1)
            }
        })
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    let results = await cache.getBatch(keys, [undefined, user2, user3]);

    t.deepEquals(results, expected, `results match expected array`);

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "getBatch" should handle buffer data', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis({
            data: {
                [`cache:${key1}`]: Buffer.from(JSON.stringify(user1)).toString('utf-8'),
                [`cache:${key2}`]: Buffer.from(JSON.stringify(user2)).toString('utf-8'),
                [`cache:${key3}`]: Buffer.from(JSON.stringify(user3)).toString('utf-8'),
            }
        })
    });

    const keys = [key1, key2, key3];
    const expected = [user1, user2, user3];

    const mgetBuffer = sinon.spy(cache.client, 'mgetBuffer');

    let results = await cache.getBatch(keys, [], {
        buffer: true,
        deserialize(value) {
            return JSON.parse(Buffer.from(value, 'utf-8').toString())
        }
    });

    t.deepEquals(results, expected, `results match expected array`);
    t.ok(mgetBuffer.calledOnce, 'should use mget buffer version');

    await cache.client.flushall();

    t.end();
})

test('CacheClientBatch: "setBatch" should serialize all values', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const users = [user1, user2, user3];

    const expected = {
        [`cache:${key1}`]: user1,
        [`cache:${key2}`]: user2,
        [`cache:${key3}`]: user3,
    };

    const setCalled = {};
    const fakeMulti = {
        set(key, value) {
            setCalled[key] = value;
        },
        exec() {},
    };

    const exec = sinon.stub(fakeMulti, 'exec');

    const multi = sinon.stub(cache.client, 'multi');
    multi.returns(fakeMulti);

    const serialize = sinon.spy(cache, 'serialize');

    await cache.setBatch(keys, users);

    for (const key of keys) {
        t.deepEquals(setCalled[key], expected[key], `key ${key}`);
    }

    t.ok(exec.calledOnce, 'commit transaction');
    t.ok(serialize.callCount === keys.length, 'serialize values');

    serialize.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "setBatch" should use custom serialize', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis()
    });

    const keys = [key1, key2, key3];
    const users = [user1, user2, user3];

    const serialize = sinon.stub(cache, 'serialize');
    serialize.callsFake(value => JSON.stringify(value));

    await cache.setBatch(keys, users);

    t.ok(serialize.callCount === keys.length, 'serialize values');

    serialize.restore();
    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "setBatch" should throw if invalid arguments', async t => {
    const cache = new CacheClientBatch({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    try {
        cache.setBatch();
    } catch (error) {
        t.ok(error, 'should throw with invalid arguments');
    }

    try {
        cache.setBatch('key');
    } catch (error) {
        t.ok(error, 'should throw with invalid arguments');
    }

    try {
        cache.setBatch(['key'], 'value');
    } catch (error) {
        t.ok(error, 'should throw with invalid arguments');
    }

    let expectedError;
    try {
        cache.setBatch(['key'], ['value']);
    } catch (error) {
        expectedError = error;
    }

    t.notOk(expectedError, 'should not throw with ok arguments');

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "delBatch" should delete batch of keys', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis({
            data: {
                [`cache:${key1}`]: JSON.stringify(user1),
                [`cache:${key2}`]: JSON.stringify(user2),
                [`cache:${key3}`]: JSON.stringify(user3),
            }
        })
    });

    const keys = [key1, key2, key3];

    await cache.delBatch(keys);

    t.deepEquals(cache.client.data.keys(), [], 'should delete all keys');

    await cache.client.flushall();

    t.end();
});

test('CacheClientBatch: "delBatch" should delete batch of keys', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        createClient: () => new Redis({
            data: {
                [`cache:${key1}`]: JSON.stringify(user1),
                [`cache:${key2}`]: JSON.stringify(user2),
                [`cache:${key3}`]: JSON.stringify(user3),
            }
        })
    });

    await cache.delBatch([key1]);

    let results = await cache.tryGetBatch([key2, key3]);

    t.deepEquals(results, [user2, user3], 'should delete given keys');

    await cache.delBatch([key3]);

    results = await cache.tryGetBatch([key2]);

    t.deepEquals(results, [user2], 'should delete given keys');

    await cache.client.flushall();

    t.end();
});

test('CacheClient: hashKeyBatch should not hash UUIDs', t => {

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        cacheKeyMatcher: UUID_CACHE_MATCHER,
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    let keys = [
        'adfadfa',
        '0c19caba-aad2-4e64-b644-a2a546528912',
        'cache:0c19caba-aad2-4e64-b644-a2a546528912',
        'sample-raw-key',
    ];

    let expected = [
        'cache:9c9003d48dc9a1ee2bd97749db6c7cc7',
        'cache:0c19caba-aad2-4e64-b644-a2a546528912',
        'cache:0c19caba-aad2-4e64-b644-a2a546528912',
        'cache:69d9380fbea522ce22fa5bc88be74a8a'
    ];

    const result = cache.hashKeyBatch(keys);
    t.deepEquals(result, expected, `batch keys`);

    t.end();
});


test('CacheClientBatch: "areHashKeys" should check keys', async t => {
    const cache = new CacheClientBatch({
        logger: noopConsole(),
        createClient: () => new Redis()
    });

    const keys = [
        'cache:cfe599a8705981bc9d8cf136591adfsf',
        'cache:cfe599a8705981bc9d8cf136591e66bf'
    ];

    let result = cache.areHashKeys(keys);

    t.ok(result, 'should not throw with ok arguments');

    await cache.client.flushall();

    t.end();
});