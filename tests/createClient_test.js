'use strict';
const test = require('tape');
const proxyquire = require("proxyquire");
const { createClient } = proxyquire('..', { ioredis: require('ioredis-mock') });

test('createClient: should use config.url', t => {
    const defaultURL = 'redis://localhost:6379';

    const result = createClient(merge({
        url: defaultURL,
        redisFactory: url => url
    }));

    t.deepEquals(result, defaultURL, `should match ${result} = ${defaultURL}`);

    t.end();
});

test('createClient: should use process.env.REDIS_URL', t => {
    const defaultURL = 'rediss://localhost:3333';

    setEnv(merge({ url: defaultURL }));

    const result = createClient({
        redisFactory: url => url
    });

    t.deepEquals(result, defaultURL, `should match ${result} = ${defaultURL}`);

    delEnv();

    t.end();
});

test('createClient: should return a valid redis client', t => {
    setEnv(merge({}));

    const client = createClient({
        url: ''
    });

    t.ok(typeof client.get === 'function', 'should have get');
    t.ok(typeof client.getBuffer === 'function', 'should have getBuffer');
    t.ok(typeof client.set === 'function', 'should have set');
    t.ok(typeof client.mget === 'function', 'should have mget');

    delEnv();
    client.disconnect();

    t.end();
});

test('createClient: should use process.env options', t => {
    const defaultURL = 'rediss://127.0.0.0:3333';

    setEnv(merge({
        port: 3333,
        host: '127.0.0.0',
        tls: true
    }));

    const result = createClient({
        redisFactory: url => url
    });

    t.deepEquals(result, defaultURL, `should match ${result} = ${defaultURL}`);

    delEnv();

    t.end();
});

test('createClient: should use config default options to build url', t => {
    const defaultURL = 'redis://localhost:6379';

    const result = createClient(merge({
        redisFactory: url => url
    }));

    t.deepEquals(result, defaultURL, `should match ${result} = ${defaultURL}`);

    t.end();
});

test('createClient: should use password to build url', t => {
    const password = 'pwd';
    const defaultURL = `redis://localhost:6379?password=${password}`;

    const result = createClient(merge({
        password,
        redisFactory: url => url
    }));

    t.deepEquals(result, defaultURL, `should match ${result} = ${defaultURL}`);

    t.end();
});

test('createClient: should use tls', t => {
    const defaultURL = `rediss://localhost:6379`;

    const result = createClient(merge({
        tls: true,
        redisFactory: url => url
    }));

    t.deepEquals(result, defaultURL, `should match ${result} = ${defaultURL}`);

    t.end();
});

const defaultOptions = {
    url: undefined,
    port: 6379,
    host: 'localhost',
    password: undefined,
    tls: false,
};

function merge(options = {}) {
    return Object.assign({}, defaultOptions, options);
}

function setEnv(options = defaultOptions) {
    if (options.url) process.env.REDIS_URL = options.url;
    if (options.port) process.env.REDIS_PORT = options.port;
    if (options.host) process.env.REDIS_HOST = options.host;
    if (options.password) process.env.REDIS_PASSWORD = options.password;
    if (options.tls) process.env.REDIS_TLS = options.tls;
}

function delEnv() {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_TLS;
}