'use strict';
const test = require('tape');
const sinon = require('sinon');
const { CacheClientBatch, CacheClientError } = require('..');
const noopConsole = require('noop-console');
const Redis = require('ioredis-mock');

const fixtures = {};

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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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

test('CacheClientBatch: "tryGetBatch" should setBatch for keys not in cache', async t => {
    const user1 = { user: 1, name: 'user1' };
    const key1 = '70d6e4c7-4da7-4bc9-9ecd-53e0c06a22ef';

    const user2 = { user: 2, name: 'user2' };
    const key2 = 'b6fdfba9-d8f9-40a2-a2a7-51fc34dddffc';

    const user3 = { user: 3, name: 'user3' };
    const key3 = '877fc553-0c31-49f0-b5b9-7beda30017d8';

    const cache = new CacheClientBatch({
        hashUUIDs: false,
        logger: noopConsole(),
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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
        cacheKeyMatcher: CacheClientBatch.UUID_CACHE_MATCHER,
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