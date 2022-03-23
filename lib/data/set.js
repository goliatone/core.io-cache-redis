const extend = require('gextend');
const defaults = require('../defaults').set;

class ManagedSet {

    constructor(id, client, options = {}) {

        this.id = id;
        this.client = client;

        extend(this, defaults, options);
    }

    async add(element) {
        element = this.serialize(element);
        await this.client.sadd(this.id, element);
        return this;
    }

    async clear() {
        await this.client.del(this.id);
    }

    async delete(element) {
        element = this.serialize(element);
        return !!(await this.client.srem(this.id, element));
    }

    async entries() {

        let values = [];
        let serializedValues = await this.client.smembers(this.id);

        for (let serialized of serializedValues) {
            //TODO: Set.prototype.entries returns [value, value]
            values.push(this.deserialize(serialized));
        }

        return values;
    }

    async forEach(cb, ctx) {
        let values = await this.entries();
        for (let serialized of values) {
            let value = this.deserialize(serialized);
            cb.call(ctx, value, value, this);
        }
    }

    async has(element) {
        element = this.serialize(element);
        return !!(await this.client.sismember(this.id, element));
    }

    size() {
        return this.client.scard(this.id);
    }

    async * values() {
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
        let response, cursor = '0';
        do {
            [cursor, response] = await this.client.sscan(this.id, cursor);
            for (let item of response) yield this.deserialize(item);
        } while (cursor !== '0');
    }
}

module.exports = ManagedSet;
