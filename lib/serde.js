const { gzip, gunzip } = require('zlib');
const { promisify } = require('util');
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

function serializeObject(src) {
    const str = JSON.stringify(src);
    return gzipAsync(Buffer.from(str));
}

async function deserializeObject(buffer) {
    const out = await gunzipAsync(buffer);
    return JSON.parse(out.toString());
}

module.exports = {
    serializeObject,
    deserializeObject,
};