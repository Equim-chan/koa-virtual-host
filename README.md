# koa-virtual-host
[![npm version](https://img.shields.io/npm/v/koa-virtual-host.svg?style=flat)](https://www.npmjs.com/package/koa-virtual-host)
[![Build Status](https://img.shields.io/travis/Equim-chan/koa-virtual-host.svg?style=flat)](https://travis-ci.org/Equim-chan/koa-virtual-host)
[![Coverage Status](https://img.shields.io/coveralls/Equim-chan/koa-virtual-host.svg?style=flat)](https://coveralls.io/github/Equim-chan/koa-virtual-host?branch=master)
[![VersionEye](https://img.shields.io/versioneye/d/user/projects/58deaba3d6c98d004405475e.svg)](https://www.versioneye.com/user/projects/58deaba3d6c98d004405475e)
[![Code Climate](https://img.shields.io/codeclimate/github/Equim-chan/koa-virtual-host/badges/gpa.svg?style=flat)](https://codeclimate.com/github/Equim-chan/koa-virtual-host)
[![Codacy Badge](https://img.shields.io/codacy/grade/9f4a3b6990134a7b9c5fe099dfb41bcd.svg?style=flat)](https://www.codacy.com/app/Equim-chan/koa-virtual-host)
[![license](https://img.shields.io/npm/l/koa-virtual-host.svg?style=flat)](https://github.com/Equim-chan/koa-virtual-host/blob/master/LICENSE)

A name-based virtual host middleware for Koa2.

## Installation
``` shell
$ npm i --save koa-virtual-host
```

## Example
``` javascript
const Koa = require('koa');
const vhost = require('koa-virtual-host');

// Import the sub Koa apps.
const apex = require('./apps/apex');
const blog = require('./apps/blog');
const forum = require('./apps/forum');
const resume = require('./apps/resume');

// Set up a host.
const host = new Koa();

// Configure the vhosts.
host.use('blog.example.com', blog);                        // support string patterns
host.use(/^(?:pro.*|resume)\.example\.com$/i, resume);      // support regexp patterns
host.use({                                                 // support pattern-app mappings as object
    'forum.example.com': forum,
    'www.example.org': apex
});
host.use([{                                                // support pattern-app mappings as array
    pattern: /^b(?:bs|oard)\.example\..+$/i,
    target: forum                                          // support many-to-one mappings
}, {
    pattern: 'example.com',
    target: apex
}]);

host.listen(80);
```

## API
### vhost(pattern, target)

* pattern (`String` | `RegExp`) - the pattern used to match the hostname
* target (`Object`) - the Koa app

Example:
``` javascript
const Koa = require('koa');
const vhost = require('koa-virtual-host');

// You can also import them from existing modules that export ones.
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

const host = new Koa();

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

* patterns (`Object` | `Array`) - the pattern-app map

Notes that if you pass an `Object` to `patterns`, RegExp patterns will not be supported. To enable RegExp support, you need to pass an `Array`.

Example:
``` javascript
const Koa = require('koa');
const vhost = require('koa-virtual-host');

const a = new Koa();
const b = new Koa();
const c = new Koa();
const d = new Koa();

a.use(async (ctx, next) => {
    ctx.body = 'Hello';
    await next();
});

b.use(async (ctx, next) => {
    await next();
    ctx.body += ' World';
});

c.use(async (ctx, next) => {
    ctx.set('X-Powered-By', 'vhost');
    await next();
});

d.use(async (ctx, next) => {
    ctx.body = 'foobar';
    await next();
    ctx.set('X-Powered-By', 'Koa');
});

const host = new Koa();

host.use(vhost({
    'localhost': a,
    '127.0.0.1': c
}));

// If duplicated, apps will be called in order
host.use(vhost([{
    pattern: 'localhost',
    target: b
}, {
    pattern: /^127\.0\.0\.\d+$/,
    target: d
}]));

host.listen(8000);
```

Try to request:
``` shell
$ curl http://localhost:8000/
Hello World

$ curl http://127.0.0.1:8000/
foobar

$ curl -X HEAD -I http://127.0.0.1:8000/ 2>&1 | grep "X-Powered-By"
X-Powered-By: Koa
```
## Test
``` shell
$ npm test
```

## License
[MIT](https://github.com/Equim-chan/koa-virtual-host/blob/master/LICENSE)
