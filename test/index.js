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
        host.listen(2333, 'localhost', function () {
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

    it('should skip to the next middleware when invalid arguments are given', (done) => {
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

        // We have to listen before the request,
        // supertest(host.listen()) doesn't work here
        host.listen(2333, 'localhost', function () {
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

    it('should serve as a normal Koa app when every vhost middleware is invalid', (done) => {
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
        host.use(vhost({}, a));
        host.use(vhost(/^127\.0\.0\.\d+$/, 'foobar'));
        host.use(vhost([], a));

        host.use(async (ctx, next) => {
            ctx.set('X-Powered-By', 'Koa');
            await next();
        })
        host.use(async (ctx, next) => {
            ctx.body = 'JS is cute';
            await next();
        });

        // We have to listen before the request,
        // supertest(host.listen()) doesn't work here
        host.listen(2333, 'localhost', function () {
            request('http://localhost:2333')
                .get('/')
                .expect(200)
                .expect('X-Powered-By', 'Koa')
                .end((err, res) => {
                    if (err) return done(err);
                    res.text.should.be.equal('JS is cute');

                    request('http://127.0.0.1:2333')
                        .get('/')
                        .expect(200)
                        .expect('X-Powered-By', 'Koa')
                        .end((err, res) => {
                            if (err) return done(err);
                            res.text.should.be.equal('JS is cute');

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
            'localhost': a
        }));
        host.use(vhost([{
            pattern: /^127\.0\.0\.1$/,
            target: b
        }]));

        host.listen(2333, 'localhost', function () {
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

    it('should skip to the next middleware when invalid arguments are given', (done) => {
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
            targetzzz: a
        }]));
        host.use(vhost([]));
        host.use(vhost('foobar'));
        host.use(vhost({
            '127.0.0.1': b              // the only valid vhost middleware
        }));
        host.use(vhost([a, b]));

        host.listen(2333, 'localhost', function () {
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

    it('should serve as a normal Koa app when every vhost middleware is invalid', (done) => {
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
        host.use(vhost({

        }));
        host.use(vhost(/^127\.0\.0\.\d+$/, 'foobar'));
        host.use(vhost([]));

        host.use(async (ctx, next) => {
            ctx.set('X-Powered-By', 'Koa');
            await next();
        })
        host.use(async (ctx, next) => {
            ctx.body = 'JS is cute';
            await next();
        });

        // We have to listen before the request,
        // supertest(host.listen()) doesn't work here
        host.listen(2333, 'localhost', function () {
            request('http://localhost:2333')
                .get('/')
                .expect(200)
                .expect('X-Powered-By', 'Koa')
                .end((err, res) => {
                    if (err) return done(err);
                    res.text.should.be.equal('JS is cute');

                    request('http://127.0.0.1:2333')
                        .get('/')
                        .expect(200)
                        .expect('X-Powered-By', 'Koa')
                        .end((err, res) => {
                            if (err) return done(err);
                            res.text.should.be.equal('JS is cute');

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
            target: b
        }]));

        // We have to listen before the request,
        // supertest(host.listen()) doesn't work here
        host.listen(2333, 'localhost', function () {
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

    it('should skip to the next middleware when invalid arguments are given', (done) => {
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
            target: 'localhost'
        }]));
        host.use(vhost());
        host.use(vhost([{
            pattern: /^127\.0\.0\.\d+$/,              // the only valid vhost middleware
            target: b
        }]));

        // We have to listen before the request,
        // supertest(host.listen()) doesn't work here
        host.listen(2333, 'localhost', function () {
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

    it('should serve as a normal Koa app when every vhost middleware is invalid', (done) => {
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
        host.use(vhost({}, a));
        host.use(vhost(/^127\.0\.0\.\d+$/, 'foobar'));
        host.use(vhost([{
            pattern: 'localhost',
            target: 'foobar'
        }]));
        host.use(vhost({
            pattern: /127\.0\.0\.1/,
            target: b
        }))
        host.use(vhost([], a));

        host.use(async (ctx, next) => {
            ctx.set('X-Powered-By', 'Koa');
            await next();
        })
        host.use(async (ctx, next) => {
            ctx.body = 'JS is cute';
            await next();
        });

        // We have to listen before the request,
        // supertest(host.listen()) doesn't work here
        host.listen(2333, 'localhost', function () {
            request('http://localhost:2333')
                .get('/')
                .expect(200)
                .expect('X-Powered-By', 'Koa')
                .end((err, res) => {
                    if (err) return done(err);
                    res.text.should.be.equal('JS is cute');

                    request('http://127.0.0.1:2333')
                        .get('/')
                        .expect(200)
                        .expect('X-Powered-By', 'Koa')
                        .end((err, res) => {
                            if (err) return done(err);
                            res.text.should.be.equal('JS is cute');

                            this.close(done);
                        });
                });
            });
    });
});