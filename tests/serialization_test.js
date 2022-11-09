'use strict';
const test = require('tape');
const Redis = require('ioredis-mock');
const CacheClient = require('..').CacheClient;
const noopConsole = require('noop-console');

test('CacheClient: should hash keys', t => {

    let client = new CacheClient({
        logger: noopConsole(),
        hashUUIDs: false,
        createClient: () => new Redis()
    });

    let keys = [{
        key: 'getAllRecords:[0-100]',
        expected: 'cache:5f53a329ca71b0a130e07b96b15ca8af',
    }, {
        key: '5f53a329ca71b0a130e07b96b15ca8af',
        expected: 'cache:1c153e73333f8c4ac04874c564431364'
    }, {
        key: '0c19caba-aad2-4e64-b644-a2a546528912',
        expected: 'cache:0c19caba-aad2-4e64-b644-a2a546528912'
    }, {
        key: 'cache:cfe599a8705981bc9d8cf136591',
        expected: 'cache:cfe599a8705981bc9d8cf136591'
    }, {
        key: 'cache:4F56EDCB1558D4DF2F77295F86059006',
        expected: 'cache:4F56EDCB1558D4DF2F77295F86059006'
    }, {
        key: 'cache:user:688e9ef9-6592-4543-bbe3-f66d2716aca0:profile',
        expected: 'cache:user:688e9ef9-6592-4543-bbe3-f66d2716aca0:profile'
    }];

    keys.forEach(fixture => {
        t.equals(
            client.hashKey(fixture.key),
            fixture.expected,
            `${fixture.key} = ${fixture.expected}`,
        );
    });

    t.end();
});


test('CacheClient: should handle custom serialization', t => {

    let client = new CacheClient({
        logger: noopConsole(),
        createClient: () => new Redis(),
        serialize(obj) {
            return JSON.stringify(obj);
        },
        desrialize(value) {
            return JSON.parse(value);
        }
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
        t.equals(client.isHashKey(fixture.key), fixture.expected);
    });

    t.end();
});