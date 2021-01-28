/*jshint esversion:6, node:true*/
'use strict';
const extend = require('gextend');

const createClient = require('./createClient');

module.exports = {
    autoinitialize: true,
    logger: extend.shim(console),
    defaultTtl: (1 * 24 * 60 * 60 * 1000),
    lastError: null,
    ttlInSeconds: false,
    errors: [],
    createClient,
    hashKeys: true,
    cacheKeyPrefix: 'cache:',
    /**
     * Matches the string `cache:` followed
     * by an md5 hash.
     */
    cacheKeyMatcher: /^cache:[a-z0-9]{32}$/i,
    clientOptions: {
        port: 6379,
        host: 'localhost',
        tls: false,
        showFriendlyErrorStack: true
    },
    serialize(obj) {
        return JSON.stringify(obj);
    },
    deserialize(value) {
        return JSON.parse(value);
    },
    makeTimestamp(value, addTimestamp) {
        if (typeof value === 'object' && addTimestamp) {
            if (!value.hasOwnProperty('cachedOn')) value.cachedOn = Date.now();
            else value._cachedOn = Date.now();
        }
    }
};
