const test = require('tape');
const sinon = require('sinon');
const promiseTimeout = require('../lib/timeout');
const { makeError, validateTimeout, TimeoutError } = promiseTimeout;


const delay = d => new Promise(r => setTimeout(r, d));

test('promiseTimeout: should resolve before timeout', async t => {
    const expected = 'expected';
    const timeout = 100;

    const result = await promiseTimeout(
        delay(50).then(_ => expected),
        timeout,
    );

    t.equals(expected, result, 'should resolve');
    t.end();
});

test('promiseTimeout: should throw if not timeout provided', async t => {
    const expected = 'expected';
    const timeout = undefined;

    let result, expectedError;
    try {
        result = await promiseTimeout(
            delay(50).then(_ => expected),
            timeout,
        );
    } catch (error) {
        expectedError = error;
    }

    t.notOk(result, 'should not return a result');
    t.ok(expectedError instanceof TypeError, 'should throw TypeError');
    t.end();
});

test('promiseTimeout: should throw if timeout not number', async t => {
    const expected = 'expected';
    const timeout = '2000';

    let result, expectedError;
    try {
        result = await promiseTimeout(
            delay(50).then(_ => expected),
            timeout
        );
    } catch (error) {
        expectedError = error;
    }

    t.notOk(result, 'should not return a result');
    t.ok(expectedError instanceof TypeError, 'should throw TypeError');
    t.end();
});

test('promiseTimeout: should throw if timeout not positive number', async t => {
    const expected = 'expected';
    const timeout = -100;

    let result, expectedError;
    try {
        result = await promiseTimeout(
            delay(50).then(_ => expected),
            timeout
        );
    } catch (error) {
        expectedError = error;
    }

    t.notOk(result, 'should not return a result');
    t.ok(expectedError instanceof TypeError, 'should throw TypeError');
    t.end();
});

test('promiseTimeout: should throw if timeout is NaN', async t => {
    const expected = 'expected';
    const timeout = NaN;

    let result, expectedError;
    try {
        result = await promiseTimeout(
            delay(50).then(_ => expected),
            timeout
        );
    } catch (error) {
        expectedError = error;
    }

    t.notOk(result, 'should not return a result');
    t.ok(expectedError instanceof TypeError, 'should throw TypeError');
    t.end();
});

test('promiseTimeout: should throw after timeout', async t => {
    const expected = 'expected';
    const timeout = 50;

    let result, expectedError;
    try {
        result = await promiseTimeout(
            delay(100).then(_ => expected),
            timeout
        );
    } catch (error) {
        expectedError = error;
    }

    t.notOk(result, 'should not return a result');
    t.ok(expectedError instanceof TimeoutError, 'should throw TimeoutError');
    t.end();
});

test('promiseTimeout: should reject if promise rejects', async t => {
    const expected = new Error();
    const timeout = 100;

    let result, expectedError;
    try {
        result = await promiseTimeout(
            delay(50).then(_ => { throw expected }),
            timeout
        );
    } catch (error) {
        expectedError = error;
    }

    t.notOk(result, 'should not return a result');
    t.equal(expectedError, expected, 'should throw TimeoutError');
    t.end();
});

test('promiseTimeout: clear should clear timeout', async t => {
    const expected = 'expected';
    const timeout = 50;

    let result, expectedError;
    try {
        result = promiseTimeout(
            delay(100).then(_ => expected),
            timeout
        );
        result.clear();
    } catch (error) {
        expectedError = error;
    }

    t.ok(result, 'should return a result');
    t.notOk(expectedError, 'should not throw TimeoutError');
    t.end();
});