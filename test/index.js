'use strict';

const Koa = require('koa');
const vhost = require('..');
const request = require('supertest');
const chai = require('chai');

chai.should();

describe('vhost(pattern, app)', () => {
  it('should forward the request to the corresponding app', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'Koa');
      await next();
    });
    a.use(async (ctx, next) => {
      ctx.body = 'Hello';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'vhost');
      await next();
    });
    b.use(async (ctx, next) => {
      ctx.body = 'World';
      await next();
    });

    const host = new Koa();
    host.use(vhost(/localhost/i, a));
    host.use(vhost('127.0.0.1', b));

    // We have to listen before the request,
    // supertest(host.listen()) doesn't work here
    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('Hello');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(200)
            .expect('X-Powered-By', 'vhost')
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('World');

              this.close(done);
            });
        });
    });
  });

  it('should forward the request to the apps in order when patterns are duplicated', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      await next();
      ctx.set('X-Powered-By', 'Koa');
    });
    a.use(async (ctx, next) => {
      ctx.body = 'Hello';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'vhost');
      await next();
    });
    b.use(async (ctx, next) => {
      ctx.body = 'World';
      await next();
    });

    const host = new Koa();
    host.use(vhost(/localhost/i, a));
    host.use(vhost('localhost', b));

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('World');

          this.close(done);
        });
    });
  });

  it('should skip invalid vhosts', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'wrong';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.body = 'right';
      await next();
    });

    const host = new Koa();
    host.use(vhost({}, a));
    host.use(vhost(/^127\.0\.0\.\d+$/, b));              // the only valid vhost middleware
    host.use(vhost([], a));
    host.use(vhost('foobar', b));

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.not.be.equal('wrong');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('right');

              this.close(done);
            });
        });
    });
  });

  it('should throw code 500/404 when the target app/pattern is not valid/bound', (done) => {
    const a = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'wrong';
      await next();
    });

    const host = new Koa();
    host.use(vhost({}, a));
    host.use(vhost([], a));
    host.use(vhost('localhost', {}));           // valid pattern, invalid app
    host.use(vhost(a, 'localhost'));
        // none of above is valid

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.not.be.equal('wrong');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(404)
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.not.be.equal('wrong');

              this.close(done);
            });
        });
    });
  });

  it('should be compatible with other middlewares in host app', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'foo';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.body = 'bar';
      await next();
    });

    const host = new Koa();

    host.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'Koa');
      await next();
    });
    host.use(async (ctx, next) => {
      await next();
      ctx.body += '\n' + ctx.path;
    });

    host.use(vhost('localhost', a));
    host.use(vhost('127.0.0.1', b));

    host.use(async (ctx, next) => {
      ctx.set('Server', 'vhost');
      await next();
    });

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333/test')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .expect('Server', 'vhost')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('foo\n/test/');

          request('http://127.0.0.1:2333/tested')
            .get('/')
            .expect(200)
            .expect('X-Powered-By', 'Koa')
            .expect('Server', 'vhost')
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('bar\n/tested/');

              this.close(done);
            });
        });
    });
  });
});

describe('vhost(patterns)', () => {
  it('should forward the request to the corresponding app', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'Koa');
      await next();
    });
    a.use(async (ctx, next) => {
      ctx.body = 'What\'s your name?';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'vhost');
      await next();
    });
    b.use(async (ctx, next) => {
      ctx.body = 'Just call me Equim >.<';
      await next();
    });

    const host = new Koa();
    host.use(vhost({
      'localhost': a,
    }));
    host.use(vhost([{
      pattern: /^127\.0\.0\.1$/,
      target: b,
    }]));

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('What\'s your name?');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(200)
            .expect('X-Powered-By', 'vhost')
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('Just call me Equim >.<');

              this.close(done);
            });
        });
    });
  });

  it('should forward the request to the apps in order when patterns are duplicated', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      await next();
      ctx.set('X-Powered-By', 'Koa');
    });
    a.use(async (ctx, next) => {
      ctx.body = 'Hello';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'vhost');
      await next();
    });
    b.use(async (ctx, next) => {
      ctx.body = 'World';
      await next();
    });

    const host = new Koa();
    host.use(vhost({
      'localhost': a,
    }));
    host.use(vhost([{
      pattern: /localhost/,
      target: b,
    }]));

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('World');

          this.close(done);
        });
    });
  });

  it('should skip invalid vhosts', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'wrong';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.body = 'right';
      await next();
    });

    const host = new Koa();
    host.use(vhost({}));
    host.use(vhost([{
      pattern: /^localhost$/,
      targetzzz: a,
    }]));
    host.use(vhost([]));
    host.use(vhost('foobar'));
    host.use(vhost({
      '127.0.0.1': b,              // the only valid vhost middleware
    }));
    host.use(vhost([a, b]));

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.not.be.equal('wrong');

          request('http://127.0.0.1:2333')
                .get('/')
                .expect(200)
                .end((err, res) => {
                  if (err) return done(err);
                  res.text.should.be.equal('right');

                  this.close(done);
                });
        });
    });
  });

  it('should throw code 500/404 when the target app/pattern is not valid/bound', (done) => {
    const a = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'wrong';
      await next();
    });

    const host = new Koa();
    host.use(vhost({}));
    host.use(vhost([{
      pattern: /^localhost$/,            // valid pattern, invalid app
      target: ['foo', 'bar'],
    }]));
    host.use(vhost([]));
    host.use(vhost('foobar'));
    host.use(vhost({
      0: a,
    }));
    host.use(vhost([a, a]));
        // none of above is valid

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.not.be.equal('wrong');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(404)
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.not.be.equal('wrong');

              this.close(done);
            });
        });
    });
  });

  it('should be compatible with other middlewares in host app', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'foo';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.body = 'bar';
      await next();
    });

    const host = new Koa();

    host.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'Koa');
      await next();
    });
    host.use(async (ctx, next) => {
      await next();
      ctx.body += '\n' + ctx.path;
    });

    host.use(vhost([{
      pattern: /lo.+st/,
      target: a,
    }, {
      pattern: '127.0.0.1',
      target: b,
    }]));

    host.use(async (ctx, next) => {
      ctx.set('Server', 'vhost');
      await next();
    });

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333/test')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .expect('Server', 'vhost')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('foo\n/test/');

          request('http://127.0.0.1:2333/tested')
            .get('/')
            .expect(200)
            .expect('X-Powered-By', 'Koa')
            .expect('Server', 'vhost')
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('bar\n/tested/');

              this.close(done);
            });
        });
    });
  });
});

describe('vhost(pattern, app) mixed with vhost(patterns)', () => {
  it('should forward the request to the corresponding app', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'Koa');
      await next();
    });
    a.use(async (ctx, next) => {
      ctx.body = 'Hello';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'vhost');
      await next();
    });
    b.use(async (ctx, next) => {
      ctx.body = 'World';
      await next();
    });

    const host = new Koa();
    host.use(vhost(/localhost/i, a));
    host.use(vhost([{
      pattern: '127.0.0.1',
      target: b,
    }]));

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('Hello');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(200)
            .expect('X-Powered-By', 'vhost')
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('World');

              this.close(done);
            });
        });
    });
  });

  it('should forward the request to the apps in order when patterns are duplicated', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      await next();
      ctx.set('X-Powered-By', 'Koa');
    });
    a.use(async (ctx, next) => {
      ctx.body = 'Hello';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'vhost');
      await next();
    });
    b.use(async (ctx, next) => {
      ctx.body = 'World';
      await next();
    });

    const host = new Koa();
    host.use(vhost([{
      pattern: '127.0.0.1',
      target: a,
    }]));
    host.use(vhost(/127\.0\.0\.1/, b));

    host.listen(2333, 'localhost', function() {
      request('http://127.0.0.1:2333')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('World');

          this.close(done);
        });
    });
  });

  it('should skip invalid vhosts', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'wrong';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.body = 'right';
      await next();
    });

    const host = new Koa();
    host.use(vhost({}));
    host.use(vhost(a, b));
    host.use(vhost([{
      pattern: a,
      target: 'localhost',
    }]));
    host.use(vhost());
    host.use(vhost([{
      pattern: /^127\.0\.0\.\d+$/,              // the only valid vhost middleware
      target: b,
    }]));

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(404)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.not.be.equal('wrong');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(200)
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('right');

              this.close(done);
            });
        });
    });
  });

  it('should throw code 500/404 when the target app/pattern is not valid/bound', (done) => {
    const a = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'wrong';
      await next();
    });

    const host = new Koa();
    host.use(vhost({}));
    host.use(vhost(a, a));
    host.use(vhost([{
      pattern: a,
      target: 'localhost',
    }]));
    host.use(vhost());
    host.use(vhost({
      'localhost': '127.0.0.1',               // valid pattern, invalid app
    }));
    host.use(vhost([{
      pattern: /^0\.0\.0\.\d+$/,
      target: a,
    }]));
        // none of above is valid

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333')
        .get('/')
        .expect(500)
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.not.be.equal('wrong');

          request('http://127.0.0.1:2333')
            .get('/')
            .expect(404)
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.not.be.equal('wrong');

              this.close(done);
            });
        });
    });
  });

  it('should be compatible with other middlewares in host app', (done) => {
    const a = new Koa();
    const b = new Koa();

    a.use(async (ctx, next) => {
      ctx.body = 'foo';
      await next();
    });

    b.use(async (ctx, next) => {
      ctx.body = 'bar';
      await next();
    });

    const host = new Koa();

    host.use(async (ctx, next) => {
      ctx.set('X-Powered-By', 'Koa');
      await next();
    });
    host.use(async (ctx, next) => {
      await next();
      ctx.body += '\n' + ctx.path;
    });

    host.use(vhost({
      'localhost': a,
    }));
    host.use(vhost(/^127\..+1$/, b));

    host.use(async (ctx, next) => {
      ctx.set('Server', 'vhost');
      await next();
    });

    host.listen(2333, 'localhost', function() {
      request('http://localhost:2333/test')
        .get('/')
        .expect(200)
        .expect('X-Powered-By', 'Koa')
        .expect('Server', 'vhost')
        .end((err, res) => {
          if (err) return done(err);
          res.text.should.be.equal('foo\n/test/');

          request('http://127.0.0.1:2333/tested')
            .get('/')
            .expect(200)
            .expect('X-Powered-By', 'Koa')
            .expect('Server', 'vhost')
            .end((err, res) => {
              if (err) return done(err);
              res.text.should.be.equal('bar\n/tested/');

              this.close(done);
            });
        });
    });
  });
});
