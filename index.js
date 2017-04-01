'use strict';

/**
 * Module dependencies.
 */
const compose = require('koa-compose');

/**
 * Expose `vhost()`.
 */
module.exports = vhost;

/**
 * When `pattern` is String or RegExp,
 * the request will be forwarded to the
 * specified `app` if the `app` matches
 * the `pattern`.
 *
 * When `pattern` is Array or Object,
 * it will try to get fetch the `app`
 * from the `pattern` map accroding
 * to the request's hostname first,
 * then forward the request.
 *
 * If `app` mismatches the `pattern`,
 * or there is no such matching record
 * in the `parttern`, it will yield to
 * the next middleware.
 *
 * For examples, check README.md.
 *
 * @param  {String | RegExp | Array | Object} pattern
 * @param  {Application} app
 * @return {Funtion}
 * @api public
 */
function vhost(pattern, app) {
    return async (ctx, next) => {
        try {
            let target = app;

            if (!target) {
                target = matchAndMap(ctx.hostname);
                if (!target) {
                    return await next();
                }
            } else if (!isMatch(pattern, ctx.hostname)) {
                return await next();
            }

            await compose(target.middleware)(ctx, next);
        } catch (err) {
            // the app is specified but malformed
            ctx.throw(500, err.message);
        }
    };

    /**
     * Returns the matched Koa app from
     * the specified `pattern` map
     * according to the `hostname`.
     *
     * Returns undefined if not found.
     *
     * The `pattern` should be either an
     * Array or Object here.
     *
     * Check README.md for more info.
     *
     * @param  {String} hostname
     * @return {Application | undefined}
     * @api private
     */
    function matchAndMap(hostname) {
        if (pattern instanceof Array) {
            for (let i = 0; i < pattern.length; i++) {
                if (isMatch(pattern[i].pattern, hostname)) {
                    return pattern[i].target;
                }
            }
            return undefined;
        }

        if (pattern instanceof Object) {
            return pattern[hostname];
        }

        return undefined;
    }

    /**
     * Check if `hostname` matches the
     * specified `condition`.
     *
     * The `condition` should be either a
     * String or a RegExp here.
     *
     * @param  {String | RegExp} condition
     * @param  {String} hostname
     * @return {Boolean}
     * @api private
     */
    function isMatch(condition, hostname) {
        if (typeof condition === 'string') {
            return condition === hostname;
        }

        if (condition instanceof RegExp) {
            return condition.test(hostname);
        }

        return false;
    }
}
