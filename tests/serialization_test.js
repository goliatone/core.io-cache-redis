'use strict';
const test = require('tape');

const CacheClient = require('..').CacheClient;
const noopConsole = require('noop-console');

const fixtures = {};


test('CacheClient: should handle custom serialization', t => {

    let client = new CacheClient({
        logger: noopConsole(),
        createClient: function() {
            const Redis = require('ioredis-mock');
            return new Redis();
        },
        serialize(obj) {
            return JSON.stringify(obj);
        },
        desrialize(value) {
            return JSON.parse(value);
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
        t.equals(client.isHashKey(fixture.key), fixture.expected);
    });

    t.end();
});