'use strict';
const test = require('tape');

const ManagedSet = require('..').ManagedSet;

const fixtures = {
    createClient() {
        const Redis = require('ioredis-mock');
        return new Redis();
    }
};


test('ManagedSet: we can add unique elements', async t => {
    const client = fixtures.createClient();

    let set = new ManagedSet('test', client);

    await set.add(1);
    await set.add(2);
    await set.add(2);

    let size = await set.size();

    t.equals(size, 2, 'We can get the right size');

    await client.flushall();
    t.end();
});

test('ManagedSet: we can clear all elements', async t => {

    const client = fixtures.createClient();

    let set = new ManagedSet('test', client);

    await set.add(1);
    await set.add(2);

    await set.clear();

    let size = await set.size();

    t.equals(size, 0, 'We can clear all elements');

    await client.flushall();
    t.end();
});

test('ManagedSet: we can delete an element', async t => {

    const client = fixtures.createClient();

    let set = new ManagedSet('test', client);

    await set.add(1);
    await set.add(2);

    await set.delete(1);

    let size = await set.size();
    let result = await set.has(1);

    t.equals(size, 1, 'We can clear all elements');
    t.equals(result, false, 'We can check if we have an element');

    await client.flushall();
    t.end();
});

test('ManagedSet: we can get entries', async t => {

    const client = fixtures.createClient();

    let set = new ManagedSet('test', client);

    await set.add('id_1');
    await set.add('id_2');
    await set.add('id_3');
    await set.add('id_4');

    let result = await set.entries();
    result = result.sort();

    for (let id of result) t.ok(id, 'Has element: ' + id);

    let expected = ['id_1', 'id_2', 'id_3', 'id_4'];

    t.deepEquals(result, expected, 'We can retrieve all elements');

    await client.flushall();
    t.end();
});


test('ManagedSet: we can forEach on all entries', async t => {

    const client = fixtures.createClient();

    let set = new ManagedSet('test', client);

    await set.add(1);
    await set.add(2);
    await set.add(3);
    await set.add(4);

    let result = [];
    await set.forEach(v => result.push(v));

    result = result.sort();

    //TODO: We need to serialize/deserialize objects so that they have same value
    let expected = [1, 2, 3, 4];

    t.deepEquals(result, expected, 'We can retrieve all elements');

    await client.flushall();
    t.end();
});


test('ManagedSet: we can check if set contains an element', async t => {

    const client = fixtures.createClient();

    let set = new ManagedSet('test', client);
    await set.add(1);

    let result = await set.has(1);

    t.equals(result, true, 'We can check elements');

    await client.flushall();
    t.end();
});


test('ManagedSet: we can forEach on all entries', async t => {

    const client = fixtures.createClient();

    let set = new ManagedSet('test', client);

    await set.add(1);
    await set.add(2);
    await set.add(3);
    await set.add(4);
    await set.add(5);
    await set.add(6);
    await set.add(7);
    await set.add(8);
    await set.add(9);
    await set.add(0);

    let result = 0;

    const it = set.values();

    for await (const element of it) {
        result++;
        t.ok(await set.has(element), 'set should contain element');
    }

    t.equals(result, 10, 'We can retrieve all elements');

    await client.flushall();
    t.end();
});
