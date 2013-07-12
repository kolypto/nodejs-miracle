'use strict';

var _ = require('underscore'),
    helper = require('./helper')
    ;

/** Miracle ACL
 * @constructor
 */
var Acl = exports.Acl = function(){
    /** Defined roles
     * @type {Array.<String>}
     * @protected
     */
    this.roles = [];

    /** Defined resources and permissions on them
     * { resource: [perm, ...] }
     * @type {Object.<String, Array.<String>>}
     * @protected
     */
    this.structure = {};

    /** Grants for roles
     * { role: { resource: [perm, ...] } }
     * @type {Object.<String, Object.<String, Array.<String>>>}
     */
    this.grants = {};
};

//region Structure

//region Structure: Create

/** Define role[s]
 * Existing roles are not overwritten nor duplicated.
 * @param {String|Array} roles
 *      Role[s] to define
 * @return {Acl}
 */
Acl.prototype.addRole = function(roles){
    this.roles = _(this.roles.concat(roles)).uniq();
    return this;
};

/** Define resource[s].
 * Existing onces are not overwritten nor duplicated.
 * @param {String|Array} resources
 *      Resource[s] to define.
 * @return {Acl}
 */
Acl.prototype.addResource = function(resources){
    this.add(
        helper.object_fill(resources, {})
    );
    return this;
};

/** Define permission[s] on resource[s].
 * @param {String|Array} resources
 *      Resource[s] to define the permissons on.
 * @param {String|Array} permissions
 *      Permission[s] to define.
 * @return {Acl}
 */
Acl.prototype.addPermission = function(resources, permissions){
    this.add(
        helper.object_fill(resources, [].concat(permissions))
    );
    return this;
};

/** Define the whole resource/permission structure with a single object.
 * @param {Object.<String, Array>} structure
 *      An object that maps resources to an array of permissions: { resource: [perm,...] }
 * @returns {Acl}
 */
Acl.prototype.add = function(structure){
    helper.deep_merge(this.structure, structure);
    return this;
};

//endregion

//region Structure: Remove

/** Remove defined role[s] and their grants.
 * @param {String|Array.<String>} roles
 *      Role[s] to remove.
 * @returns {Acl}
 */
Acl.prototype.removeRole = function(roles){
    roles = [].concat(roles); // ensure array
    // Remove roles
    this.roles = _.difference(this.roles, roles);
    // Remove grants
    this.grants = _.omit(this.grants, roles);
    return this;
};

/** Remove defined resource[s] along with their grants and permissions.
 * @param {String|Array.<String>} resources
 *      Resource[s] to remove.
 * @returns {Acl}
 */
Acl.prototype.removeResource = function(resources){
    // Remove resources
    var rm = helper.object_fill([].concat(resources), undefined);
    helper.deep_diff(this.structure, rm);
    // Remove grants
    helper.deep_diff(this.grants,
        helper.object_fill(
            Object.getOwnPropertyNames(this.grants), // roles
            rm
        )
    );
    return this;
};

/** Remove permission[s] defined under a role.
 * @param {String|Array.<String>} resources
 *      Resource[s] to remove the permissions from.
 * @param {String|Array.<String>} permissions
 *      Permission[s] to remove.
 * @returns {Acl}
 */
Acl.prototype.removePermission = function(resources, permissions){
    // Remove permissions
    var rm = helper.object_fill([].concat(resources), [].concat(permissions));
    helper.deep_diff(this.structure, rm);
    // Remove grants
    helper.deep_diff(this.grants,
        helper.object_fill(
            Object.getOwnPropertyNames(this.grants), // roles
            rm
        )
    );
    return this;
};

//endregion

//region Structure: List

/** Get the list of defined roles.
 * @returns {Array.<String>}
 */
Acl.prototype.listRoles = function(){
    return this.roles;
};

/** Get the list of defined resources, including those with empty permissions list.
 * @returns {Array.<String>}
 */
Acl.prototype.listResources = function(){
    return _.keys(this.structure);
};

/** Get the list of permissions for a resource, or for multiple resources.
 * @param {String|Array.<String>} resources
 *      Resource[s] to get the permissions for.
 * @returns {Array.<String>}
 */
Acl.prototype.listPermissions = function(resources){
    return _.compose(_.uniq, _.flatten, _.values)(this.list(resources));
};

/** Get the list of permissions for resources in a structured object.
 * @param {String|Array.<String>?} resources
 *      Resource[s] to get the structure for. Optional.
 * @returns {Object.<String, Array.<String>>}
 */
Acl.prototype.list = function(resources){
    if (!resources)
        return this.structure;
    return _.pick(this.structure, [].concat(resources));
};

//endregion

//endregion

//region Grant
//endregion

//region Authorize
//endregion

//region Show
//endregion