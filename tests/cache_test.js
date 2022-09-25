'use strict';
const test = require('tape');

const CacheClient = require('..').CacheClient;

const fixtures = {};


test('CacheClient: isHashKey should identify valid cache keys using default pattern', t => {

    let client = new CacheClient({
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
        const result = client.isHashKey(fixture.key);
        t.equals(result, fixture.expected, `is "${fixture.key}" a hash hey? ${result}`);
    });

    t.end();
});


test('CacheClient: isHashKey should identify valid cache keys using custom pattern', t => {

    let client = new CacheClient({
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        const result = client.isHashKey(fixture.key);
        t.equals(result, fixture.expected, `is "${fixture.key}" a hash hey? ${result}`);
    });

    t.end();
});


test('CacheClient: hashKey should not hash UUIDs', t => {

    let client = new CacheClient({
        hashUUIDs: false,
        cacheKeyMatcher: CacheClient.UUID_CACHE_MATCHER,
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
        const result = client.hashKey(fixture.key);
        t.equals(result, fixture.expected, `"${fixture.key}" = "${result}"`);
    });

    t.end();
});