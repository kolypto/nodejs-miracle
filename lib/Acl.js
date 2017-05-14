'use strict';

var _ = require('lodash'),
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
    this.roles = _(this.roles.concat(roles)).uniq().value();
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
    return _.flowRight(_.uniq, _.flatten, _.values)(this.list(resources));
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

/** Grant permission[s] over resource[s] to the specified role[s].
 * @param {String|Array.<String>} roles
 * @param {String|Array.<String>|Object} resources
 * @param {String|Array.<String>?} permissions
 * @returns {Acl}
 */
Acl.prototype.grant = function(roles, resources, permissions){
    roles = [].concat(roles);
    var grants = resources;

    // Handle footprints
    if (arguments.length == 3) // (roles, resources, permissions)
        return this.grant(roles, helper.object_fill([].concat(resources), [].concat(permissions)));
    if (arguments.length == 1){ // (grants)
        helper.deep_merge(this.grants, arguments[0]);
        return this;
    }

    // Ensure the entities exist
    this.addRole(roles);
    this.add(grants);

    // Merge into the grants
    helper.deep_merge(this.grants, helper.object_fill(roles, grants));
    return this;
};

/** Revoke permission[s] over resource[s] from the specified role[s].
 * @param {String|Array.<String>?} roles
 * @param {String|Array.<String>|Object?} resources
 * @param {String|Array.<String>?} permissions
 * @returns {Acl}
 */
Acl.prototype.revoke = function(roles, resources, permissions){
    // Handle footprints
    if (!roles){ // revoke()
        this.grants = {}; // hard reset :)
        return this;
    }

    roles = [].concat(roles);

    // Footprints
    var grants = resources; // revoke(roles), revoke(roles, grants)
    if (_.isArray(resources) || !_.isObject(resources))
        grants = _.isUndefined(resources) // revoke(roles, resources)
                    ? undefined
                    : helper.object_fill(
                        [].concat(resources),
                        _.isUndefined(permissions) // revoke(roles, resources, permissions)
                            ? undefined
                            : [].concat(permissions)
                    );

    // Diff from the grants
    helper.deep_diff(this.grants, helper.object_fill(roles, grants));
    return this;
};

//endregion

//region Authorize

/** Check whether all of the named role[s] have access to all resource[s] with permission[s].
 * In order to pass the test, all roles must have access to all resources.
 * @param {String|Array.<String>?} roles
 * @param {String|Array.<String>|Object?} resources
 * @param {String|Array.<String>?} permissions
 * @returns {Boolean}
 */
Acl.prototype.check = function(roles, resources, permissions){
    roles = [].concat(roles);
    var grants = resources;

    // Footprints
    if (resources === undefined) // check(roles)
        return _.difference(roles, Object.keys(this.grants)).length == 0; // all grants
    else if (_.isArray(resources) || !_.isObject(resources)) // check(roles, resources[, permissions])
        return this.check(roles, helper.object_fill(resources, permissions || []));

    // check(roles, grants)
    return _.every(roles, function(role){ // TODO: benchmark & optimize
        return this[role] !== undefined &&
            _.every(Object.keys(grants), function(resource){
                return this[resource] !== undefined && _.difference([].concat(grants[resource]), this[resource]).length == 0;
            }.bind(this[role]));
    }.bind(this.grants));
};

/** Check whether any of the named role[s] have access to any resource[s] with permission[s].
 * In order to pass the test, any roles having access to any resource is sufficient.
 * @param {String|Array.<String>?} roles
 * @param {String|Array.<String>|Object?} resources
 * @param {String|Array.<String>?} permissions
 * @returns {Boolean}
 */
Acl.prototype.checkAny = function(roles, resources, permissions){
    roles = [].concat(roles);
    var grants = resources;

    // Footprints
    if (resources === undefined) // check(roles)
        return _.intersection(roles, Object.keys(this.grants)).length != 0; // any grant
    else if (_.isArray(resources) || !_.isObject(resources)) // check(roles, resources[, permissions])
        return this.checkAny(roles, helper.object_fill(resources, permissions || []));

    // check(roles, grants)
    if (_.isEmpty(grants))
        return true;
    return _.some(roles, function(role){ // TODO: benchmark & optimize
        return this[role] !== undefined &&
            _.some(Object.keys(grants), function(resource){
                return this[resource] !== undefined && (
                    grants[resource].length === 0 ||
                    _.intersection([].concat(grants[resource]), this[resource]).length != 0
                );
            }.bind(this[role]));
    }.bind(this.grants));
};

//endregion

//region Show

/** Collect grants that each of the provided roles have (intersection).
 * @param {String|Array.<String>} roles
 * @returns {Object.<String, Array.<String>>}
 */
Acl.prototype.which = function(roles){
    roles = [].concat(roles);
    var grants = this.grants[roles.pop()] || {};
    return _.reduce(roles, function(grants, role){
        if (this[role] === undefined)
            return {};
        // Drop keys with no perms
        grants = _.omit(grants, _.difference(Object.keys(grants), Object.keys(this[role])));
        // The remaining keys coinside
        for (var resource in grants)
            if (grants.hasOwnProperty(resource)){
                grants[resource] = _.intersection(grants[resource], this[role][resource]);
                if (grants[resource].length == 0)
                    delete grants[resource];
            }
        return grants;
    }.bind(this.grants), grants);
};

/** Collect grants that any of the provided roles have (union).
 * @param {String|Array.<String>} roles
 * @returns {Object.<String, Array.<String>>}
 */
Acl.prototype.whichAny = function(roles){
    var grants = {};
    _.each(_.pick(this.grants, [].concat(roles)), function(v, role){
        helper.deep_merge(grants, v);
    });
    return grants;
};

/** Get grants for the specified roles.
 * @param {String|Array.<String>?} roles
 * @returns {Object.<String, Object.<String, Array.<String>>>}
 */
Acl.prototype.show = function(roles){
    if (roles === undefined)
        return this.grants;
    return _.pick(this.grants, [].concat(roles));
};

//endregion
