'use strict';

const extend = require('gextend');

const defaults = {
    redisFactory(url) {
        const Redis = require('ioredis');
        return new Redis(url);
    }
};

function createClient(options = {}) {
    options = extend({}, defaults, options);

    const host = options.host;
    const port = options.port;
    const password = options.password;

    const protocol = options.tls ? 'rediss' : 'redis';

    const queryString = password ? `?password=${encodeURIComponent(password)}` : '';

    const url = `${protocol}://${host}:${port}/${queryString}`;

    return options.redisFactory(url);
}


module.exports = createClient;
