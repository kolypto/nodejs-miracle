/** Helper functions
 */

'use strict';

var _ = require('lodash')
    ;

/** Get an array filled with `n` elements of `value`
 * @param {Number} n
 * @param {*} value
 * @returns {Array}
 */
var array_fill = exports.array_fill = function(n, value){
    var l = new Array(n);
    for (var i = 0; i<n; i++)
        l[i] = value;
    return l;
};

/** Get an object with `keys` initialized to `value`
 * @param {String|Array.<String>} keys
 * @param {*} value
 * @returns {Object}
 */
var object_fill = exports.object_fill = function(keys, value){
    keys = [].concat(keys);
    return _.object(keys, array_fill(keys.length, value));
};

/** Deeply merge `src` into `dst`
 * - Copy missing object properties
 * - Merge arrays
 * - Recursively merge objects
 * @param {Object} dst
 * @param {Object} src
 * @returns {Object}
 */
var deep_merge = exports.deep_merge = function(dst, src){
    _(src).each(function(v, k){
        if (_.isArray(v)) // merge
            dst[k] = _.union(dst[k] || [], v).sort();
        else if (_.isObject(v)){ // recurse
            if (dst[k] === undefined) // create missing keys
                dst[k] = {};
            deep_merge(dst[k], v);
        }
        else // init | overwrite
            dst[k] = v;
    });
};

/** Deeply exclude `src` from `dst`
 * - Diff arrays
 * - Recursively diff objects
 * - Remove object keys with `undefined` src
 * @param {Object} dst
 * @param {Object} src
 * @returns {Object}
 */
var deep_diff = exports.deep_diff = function(dst, src){
    _(src).each(function(v, k){
        if (dst[k] === undefined) // does not exist
            return;
        if (v === undefined) // unset
            delete dst[k];
        else if (_.isArray(v)){ // array diff
            dst[k] = _.difference(dst[k], v).sort();
            if (!dst[k].length)
                delete dst[k];
        }
        else // recurse
            deep_diff(dst[k], v);
    });
};
