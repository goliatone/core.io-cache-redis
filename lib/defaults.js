/*jshint esversion:6, node:true*/
'use strict';
const extend = require('gextend');

const createClient = require('./createClient');
const _5_seconds = 5 * 1000;
const _24_hours = (1 * 24 * 60 * 60 * 1000);

const defaultCacheKeyPrefix = 'cache:';

module.exports = {
    autoinitialize: true,
    logger: extend.shim(console),
    /**
     * TTL value for expire
     * keys in milliseconds by default.
     */
    defaultTTL: _24_hours,
    /**
     * Use TTL as seconds?
     */
    ttlInSeconds: false,
    clientConnectionTimeout: _5_seconds,
    lastError: null,
    errors: [],
    createClient,
    hashKeys: true,
    defaultCacheKeyPrefix,
    cacheKeyPrefix: defaultCacheKeyPrefix,
    tryGetOptions: {
        deserialize: true,
        addTimestamp: true,
        throwOnError: false,
        forceCacheMiss: false,
    },
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
        if (typeof value !== 'object' || !addTimestamp) return value;

        if (value.hasOwnProperty('cachedOn')) value.cachedOn = Date.now();
        else value._cachedOn = Date.now();

        return value;
    }
};