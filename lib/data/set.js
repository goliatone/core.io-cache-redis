class ManagedSet {
    constructor(id, client) {
        this.id = id;
        this.client = client;
    }

    async add(key) {
        await this.client.sadd(this.id, key);
        return this;
    }

    async clear() {
        await this.client.del(this.id);
    }

    async delete(key) {
        return !!(await this.client.srem(this.id, key));
    }

    async entries() {
        let values = await this.client.smembers(this.id);
        //TODO: Set.prototype.entries returns [value, value]
        return values;
    }

    async forEach(cb, ctx) {
        let values = await this.entries();
        for (let value of values) {
            cb.call(ctx, value, value, this);
        }
    }

    async has(key) {
        return !!(await this.client.sismember(this.id, key));
    }

    size() {
        return this.client.scard(this.id);
    }

    async * values() {
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Iterators_and_Generators
        let response, cursor = '0';
        do {
            [cursor, response] = await this.client.sscan(this.id, cursor);
            for (let item of response) yield item;
        } while (cursor !== '0');
    }
}

module.exports = ManagedSet;
