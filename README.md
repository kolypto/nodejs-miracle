Miracle
=======

Miracle is an ACL for NodeJS that was designed to be well-structuted,
simple yet exhaustive. It uses *roles* to grant *permissions* over *resources*.

To be a universal tool, it does not include any special cases, 
does not force you to persist and does not insist on any formats or conventions.

Maximum flexibility and total control. Enjoy! :)

Inspired by
[https://github.com/optimalbits/node_acl](node-acl)
and
[https://npmjs.org/package/nod](nod).

Reference
=========

{:toc}

Define The Structure
--------------------

### Create

You can define the structure explicitly to keep things at their places,
however this is optional: any role, resource or permission mentioned in 
`grant()` is created implicitly.

### Create

#### `addRole(roles)`
Define role[s]. 

* `roles`: the role[s] to define.

The role will have no permissions granted, but will appear in `listRoles()`.

```js
acl.addRole('admin');
acl.addRole(['anonymous', 'registered']);

acl.listRoles(); // -> ['admin', 'anonymous', 'registered']
```

#### `addResource(resources)`
Define a resource.

* `resources`: resource[s] to define.

The resource will have no permissions defined but will list in 
`listResources()`.

```js
acl.addResource('blog');
acl.addResource(['page', 'article']);

acl.listResources(); // -> ['blog', 'page', 'article']
```

#### `addPermission(resources, permissions)`
Define permission[s] on resource[s].

* `resources`: resource[s] to define the permission under.
    Are created if were not previously defined.
* `permissions`: permission[s] to define.

The defined permissions are not granted to anyone, but will appear in 
`listPermissions()`.

```js
acl.addPermission('blog', 'post');
acl.addPermission(['page', 'article'], ['create', 'read', 'update', 'delete']);

acl.listPermissions('page'); // -> ['create', 'read', 'update', 'delete']
```

#### `add(structure)`
Define the whole resource/permission structure with a single object.

* `structure`: an object that maps resources to an array of permissions.

```js
acl.add({
    blog: ['post'],
    page: ['create', 'read', 'update', 'delete'],
    article: ['create', 'read', 'update', 'delete'],
});
```

### Remove
#### `removeRole(roles)`
Remove defined role[s] and their grants.

* `roles`: role[s] to remove.

```js
acl.removeRole('admin');
acl.removeRole(['anonymous', 'registered']);
```

#### `removeResource(resources)`
Remove defined resource[s] along with their grants and permissions.

* `resources`: resource[s] to remove.

```js
acl.removeResource('blog');
acl.removeResource(['page', 'article']);
```

#### `removePermission(resources, permissions)`
Remove permission[s] defined under a role.

* `resources`: resource[s] to remove the permissions from.
* `permissions`: permission[s] to remove.

The resource is not implicitly removed: it remains with an empty set of permissions.

```js
acl.removePermissions('blog', 'post');
acl.removePermissions(['page', 'article'], ['create', 'update']);
```

### List

#### `listRoles()`
Get the list of defined roles.

```js
acl.listRoles(); // -> ['admin', 'anonymous', 'registered']
```

#### `listResources()`
Get the list of defined resources, including those with empty permissions list.

```js
acl.listResources(); // -> ['blog', 'page', 'article']
```

#### `listPermissions(resources)`
Get the list of permissions for a resource, or for multiple resources.

* `resources`: resource[s] to get the permissions for. Optional.

```js
acl.listPermissions('page'); // -> ['create', 'read', 'update', 'delete']
acl.listPermissions(['blog', 'page']); // -> ['post', 'create', ... ]
acl.listPermissions(); // -> [ ..all.. ]
```

#### `list([resources])`
Get the list of permissions for resources in a structured object.

* `resources`: resource[s] to get the structure for. Optional.

Returns an object: `{ resource: [perm, ...] }`.
    
```js
acl.list(); // -> { blog: ['post'], page: ['create', ...] }
acl.list('blog'); // -> { blog: ['post'] }
acl.list(['blog', 'page']); // -> { blog: ['post'], page: ['create', ...] }
```

### Export and Import

Miracle does not offer any built-in persistence offers enough facilities to 
implement it the way you need:

```js
var miracle = require('miracle');

var acl = new miracle.Acl();

// Export
var save = {
    roles: acl.listRoles(),
    struct: acl.list(),
    grants: acl.show()
};

// Import
acl.addRole(save.roles);
acl.add(save.struct);
acl.grant(save.grants);
```

Note: as `Acl.grant()` defines all the necessary roles, resources and 
permissions, there's no ultimate need to export them explicitly.



Grant Permissions
-----------------

### grant(roles, resources, permissions)
Grant permission[s] over resource[s] to the specified role[s].

Has multiple footprints:

* `grant(roles, resources, permissions)` - grant permissions 
    to the listed resources ;
* `grant(roles, grants)` - grant permissions using a grant object that maps 
    a list of permissions to a resource: `{ resource: [perm, ...] }`.
    
Roles, resources and permissions are implicitly created if missing.

```js
acl.grant(['admin', 'manager'], 'blog', ['create', 'update']);
acl.grant('anonymous', { page: ['view'] });
```

### revoke(roles[, resources[, permissions]])
Revoke permission[s] over resource[s] from the specified role[s].

Has multiple footprints:

* `revoke(roles)` remove permissions from all resources ;
* `revoke(roles, resources)` remove all permissions from the listed resources ;
* `revoke(roles, resources, permissions)` remove specific permissions
    from the listed resources ;
* `revoke(roles, grants)` - revoke permissions using a grant object that maps
    a list of permissions to a resource: `{ resource: [perm, ...], ... }`.

No roles, resources or permissions are removed implicitly.

```js
acl.revoke('anonymous');
acl.revoke(['admin', 'manager'], 'blog', ['create', 'update']);
acl.revoke('anonymous', { page: ['view'] });
```



Authorize
---------

### check(roles, resources[, permissions])
Check whether the named role[s] have access to resource[s] with permission[s].

Has multiple footprints:

* `check(roles, resources)`: check whether the role[s] have any access to the
    named resource[s].
* `check(roles, resources, permissions)`: check with a specific set of
    permissions.
* `check(roles, grants)`: check using a grants object.

In order to pass the test, all roles must have access to all resources.

Returns a boolean.

```js
acl.check('admin', 'blog'); // -> true
acl.check(['anonymous'], 'blog', 'read'); // -> true
acl.check('registered', { page: ['update', 'delete'] });
```

### checkAny(roles, resources[, permissions])

Same as `check`, but the united permissions are checked.

Also supports the `checkAny(roles, grants)` fingerprint.


Show Grants
-----------

### which(roles)
Collect grants that each of the provided roles have (intersection).

```js
acl.which('admin'); // -> { blog: ['post'] }
```

### whichAny(roles)
Collect grants that any of the provided roles have (union).

```js
acl.which(['anonymous', 'registered']); // -> { page: ['view'] }
```

### show([roles])
Get grants for the specified roles.

* `roles`: role[s] to get the grants for.

Returns an object `{ role: { resource: [perm, ...] } }`. 
Roles that were not defined are not mentioned in the result.

```js
acl.show(); // -> { admin: { blog: ['post'] } }
acl.show('admin');
acl.show(['admin', 'anonymous']);
```
