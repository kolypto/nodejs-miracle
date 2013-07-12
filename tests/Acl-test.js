var vows = require('vows'),
    _ = require('underscore'),
    assert = require('assert'),
    miracle = require('..')
    ;

vows.describe('Miracle')
    // Add
    .addBatch({
        'Add': {
            topic: function(){
                return function(){ // Acl maker
                    return new miracle.Acl();
                };
            },
            'roles': {
                topic: function(acl){
                    acl = acl();
                    acl.addRole('root'); // add
                    acl.addRole('superadmin'); // add again
                    acl.addRole(['user', 'poweruser']); // add an array
                    acl.addRole('root'); // no overwrite
                    acl.addRole(['superadmin', 'n00b']); // add & skip
                    return acl;
                },

                'added': function(acl){
                    assert.deepEqual(acl.listRoles(), ['root', 'superadmin', 'user', 'poweruser', 'n00b']);
                },

                '& removed': {
                    topic: function(acl){
                        acl.removeRole('poweruser');
                        acl.removeRole(['poweruser', 'n00b']);
                        return acl;
                    },

                    'removed': function(acl){
                        assert.deepEqual(acl.listRoles(), ['root', 'superadmin', 'user']);
                        // also removes grants: check later
                    }
                }
            },
            'resources': {
                topic: function(acl){
                    acl = acl();
                    acl.addResource('users'); // one
                    acl.addResource('pages');
                    acl.addResource(['news', 'articles']); // array
                    acl.addResource('users'); // no overwrite
                    acl.addResource(['pages', 'blog']); // add & skip
                    return acl;
                },

                'added': function(acl){
                    assert.deepEqual(acl.listResources(), ['users', 'pages', 'news', 'articles', 'blog']);
                },

                '& removed': {
                    topic: function(acl){
                        acl.removeResource('articles');
                        acl.removeResource(['articles', 'blog']);
                        return acl;
                    },
                    'removed': function(acl){
                        assert.deepEqual(acl.listResources(), ['users', 'pages', 'news']);
                    }
                }
            },

            'permissions': {
                topic: function(acl){
                    acl = acl();
                    acl.addPermission('user', ['read', 'update']);
                    acl.addPermission(['user', 'event'], 'create');
                    acl.addPermission(['user', 'log'], ['delete']);
                    return acl;
                },

                'added': function(acl){
                    // Resources created
                    assert.deepEqual(acl.listResources(), ['user', 'event', 'log']);
                    // Permissions are correct
                    assert.deepEqual(acl.listPermissions('user'), ['read', 'update', 'create', 'delete']);
                    assert.deepEqual(acl.listPermissions('event'), ['create']);
                    assert.deepEqual(acl.listPermissions('log'), ['delete']);
                    // listPermissions() works fine
                    assert.deepEqual(acl.listPermissions(['log', 'event']), ['delete', 'create']);
                    assert.deepEqual(acl.listPermissions(['event', 'log']), ['create', 'delete']);
                },
                'listPermissions() works fine': function(acl){
                    // All
                    assert.deepEqual(acl.listPermissions(), ['read', 'update', 'create', 'delete']);
                    // Invalid -> nothing
                    assert.deepEqual(acl.listPermissions(':)'), []);
                    // array ok
                    assert.deepEqual(acl.listPermissions('user'), ['read', 'update', 'create', 'delete']);
                    // duplicates removed
                    assert.deepEqual(acl.listPermissions(['user', 'user']), ['read', 'update', 'create', 'delete']);
                },
                'list() works fine': function(acl){
                    // All
                    assert.deepEqual(acl.list(), { user: ['read', 'update', 'create', 'delete'], log: ['delete'], event: ['create'] });
                    // Invalid -> nothing
                    assert.deepEqual(acl.list(':)'), []);
                    // array ok
                    assert.deepEqual(acl.list('user'), { user: ['read', 'update', 'create', 'delete'] });
                    assert.deepEqual(acl.list(['log', 'event']), { log: ['delete'], event: ['create'] });
                }
            },

            'add()': {
                topic: function(acl){
                    acl = acl();
                    acl.add({
                        user: ['c', 'r', 'u', 'd'],
                        event: ['c'],
                        log: ['d']
                    });
                    return acl;
                },
                'resources added': function(acl){
                    assert.deepEqual(acl.listResources(), ['user', 'event', 'log']);
                },
                'permissions added': function(acl){
                    assert.deepEqual(acl.list(), { user: ['c', 'r', 'u', 'd'], log: ['d'], event: ['c'] });
                }
            }
        }
    })
    .export(module);
