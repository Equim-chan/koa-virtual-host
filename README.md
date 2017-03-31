# koa-virtual-host
[![npm version](https://img.shields.io/npm/v/koa-virtual-host.svg)](https://www.npmjs.com/package/koa-virtual-host)
[![Build Status](https://travis-ci.org/Equim-chan/koa-virtual-host.svg?branch=master)](https://travis-ci.org/Equim-chan/koa-virtual-host)
[![Coverage Status](https://coveralls.io/repos/github/Equim-chan/koa-virtual-host/badge.svg?branch=master)](https://coveralls.io/github/Equim-chan/koa-virtual-host?branch=master)
[![Code Climate](https://codeclimate.com/github/Equim-chan/koa-virtual-host/badges/gpa.svg)](https://codeclimate.com/github/Equim-chan/koa-virtual-host)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/9f4a3b6990134a7b9c5fe099dfb41bcd)](https://www.codacy.com/app/Equim-chan/koa-virtual-host?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=Equim-chan/koa-virtual-host&amp;utm_campaign=Badge_Grade)

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
// Suppose you have created or imported Koa apps "blog", "forum" and "equim".

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

// ...
```

## Test
``` shell
$ npm test
```

## License
[MIT](https://github.com/Equim-chan/koa-virtual-host/blob/master/LICENSE)
