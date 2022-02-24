## core.io Cache Redis

This package provides a module for the [core.io](https://npmjs.com/package/core.io) library.

### Install

```
$ npm i -S core.io-cache-redis
```

### Usage

The `CacheClient` exposes a `tryGet` function that takes a key, a `fallback` function and an options object.

* `key`: Either a string or an object that will be used to create a cache identification key. If key is not found in the cache we call `fallback` and store the functions output in cache using key as identifier. Next time we call `tryGet` we return the cached value.
* `fallback`: Some (expensive) function that we want to cache the outputs of its execution.

**Options**:
* `ttl` default(defaultTTL): Time to live for the key after which the key expires.
* `deserialize` default(`true`): Call `deserialize` on the cached value
* `addTimestamp` default(`true`): Add a timestamp to the cached value
* `throwOnError` default(`false`): If `true` any errors while calling `fallback` will be thrown, else returned in the value
* `forceCacheMiss` default(`false`): Function or boolean to check if we want to force `fallback` call.


```js
result = await cache.tryGet(query, async _ => {
    return await service.query(query);
});
```

## License

® License   by goliatone
