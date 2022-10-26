module.exports.init = require('./lib/init');

module.exports.CacheClient = require('./lib/cache');

module.exports.CacheClientBatch = require('./lib/cacheBatch');

module.exports.CacheClientError = require('./lib/errors').CacheClientError;

module.exports.createClient = require('./lib/createClient');

module.exports.UUID_CACHE_MATCHER = /^cache:?(.*:)[-a-z0-9]{36}$/i;