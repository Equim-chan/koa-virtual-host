# koa-virtual-host
<!-- badges -->
A hostname-based virtual host middleware for Koa2.

## Installation
``` shell
$ npm i --save koa-virtual-host
```

## API
### vhost(pattern, target)

* pattern (`String` | `RegExp`) - the pattern used to match the hostname
* target (`Object`) - the Koa app

Example:
``` javascript
const Koa = require('koa');
const vhost = require('koa-virtual-host');

// Two individual Koa2 apps.
// You can also import them from existing modules that exported ones.
const a = new Koa();
const b = new Koa();

a.use(async (ctx, next) => {
    ctx.body = 'Hello';
    await next();
});

b.use(async (ctx, next) => {
    ctx.body = 'World';
    await next();
});

// Create a host
const host = new Koa();

// Set the virtual hosts.
// The pattern can be either a string or a regexp here.
// The requests that match the pattern will be forwarded to the corresponding app.
host.use(vhost(/localhost/i, a));
host.use(vhost('127.0.0.1', b));

host.listen(8000);
```

Try to request:
``` shell
$ curl http://localhost:8000/
Hello

$ curl http://127.0.0.1:8000/
World
```

### vhost(patterns)

* pattern (`Object` | `Array`) - the patterns-apps map

Notes that passing `Object` will not support RegExp patterns. To support RegExp, you need to pass an `Array`.

Example:
``` javascript
// ...
// Suppose you have created or imported "blog" and "forum".

const host = new Koa();

host.use(vhost({
    'blog.example.com': blog,
    'forum.example.com': forum,
    'board.example.com': forum       // many-to-one mappings are acceptable
}));

/**
 * Alternatively
 */

host.use(vhost([{
    pattern: 'blog.example.com',
    target: blog
}, {
    pattern: 'forum.example.com',
    target: forum
}, {
    pattern: /^eq.+\.example\.com/,
    target: equim
}]));
```

## Test
``` shell
$ npm test
```

## License
[MIT](https://github.com/Equim-chan/koa-virtual-host/blob/master/LICENSE)
