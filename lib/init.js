'use strict';

const CacheClient = require('../lib/cache');
const CacheClientBatch = require('../lib/cacheBatch');

module.exports = function(context, config) {
    const logger = context.getLogger(config.moduleid);

    logger.info('Creating cache client...');

    if (!config.logger) config.logger = logger;

    return new Promise((resolve, reject) => {
        context.resolve(config.dependencies, true).then(_ => {

            const CacheConstructor = config.batchClient ?
                CacheClientBatch :
                CacheClient;

            const cache = new CacheConstructor(config);

            /**
             * Expose a function to retrieve
             * the redis client so that others can
             * use it
             */
            context.provide('getCacheClient', _ => cache.client);

            resolve(cache);
        });
    });
};