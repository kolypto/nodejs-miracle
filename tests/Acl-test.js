var vows = require('vows'),
    _ = require('underscore'),
    assert = require('assert'),
    miracle = require('..')
    ;

vows.describe('Miracle')
    // Create, Remove, List
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

                '& remove': {
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

                '& remove': {
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
    // Grant / Revoke
    .addBatch({
        'Acl': {
            topic: function(){
                return function(){ // maker
                    var acl = new miracle.Acl();

                    acl.grant(['guest', 'anonymous'], '/page', ['read']);
                    acl.grant('demo', ['/article', '/blog'], 'vote');
                    acl.grant('user', ['/profile', '/article'], ['create', 'edit']);
                    acl.grant(['user', 'admin'], {
                        '/page': ['create', 'read', 'edit', 'delete'],
                        '/profile': ['create', 'delete']
                    });
                    acl.grant('admin', {
                        '/admin': ['open', 'manage'],
                    });

                    return acl;
                };
            },

            'grant': {
                topic: function(acl){
                    return acl();
                },

                'structure created': function(acl){
                    assert.deepEqual( acl.listRoles(), ['guest', 'anonymous', 'demo', 'user', 'admin'] );
                    assert.deepEqual( acl.listResources(), ['/page', '/article', '/blog', '/profile', '/admin'] );
                    assert.deepEqual( acl.listPermissions('/page') , ['read', 'create', 'edit', 'delete']);
                    assert.deepEqual( acl.listPermissions('/article') , ['vote', 'create', 'edit']);
                    assert.deepEqual( acl.listPermissions('/blog') , ['vote']);
                    assert.deepEqual( acl.listPermissions('/profile') , ['create', 'edit', 'delete']);
                    assert.deepEqual( acl.listPermissions('/admin') , ['open', 'manage']);
                },

                'grants object sane': function(acl){
                    assert.deepEqual(acl.grants, {
                        guest: {
                            '/page': ['read']
                        },
                        anonymous: {
                            '/page': ['read']
                        },
                        demo: {
                            '/article': ['vote'],
                            '/blog': ['vote']
                        },
                        user: {
                            '/profile': ['create', 'edit', 'delete'],
                            '/article': ['create', 'edit'],
                            '/page': ['create', 'read', 'edit', 'delete']
                        },
                        admin: {
                            '/page': ['create', 'read', 'edit', 'delete'],
                            '/admin': ['open', 'manage'],
                            '/profile': ['create', 'delete']
                        }
                    });
                }
            },

            'revoke': {
                '()': {
                    topic: function(acl){
                        acl = acl();
                        acl.revoke();
                        return acl;
                    },

                    'revoked everything from the roles': function(acl){
                        assert.deepEqual( acl.grants, {} );
                    }
                },
                '(roles)': {
                    topic: function(acl){
                        acl = acl();
                        acl.revoke('guest');
                        acl.revoke(['anonymous', 'demo']);
                        acl.revoke('not existent');
                        return acl;
                    },

                    'revoked everything from the roles': function(acl){
                        assert.deepEqual( Object.keys(acl.grants), ['user', 'admin'] );
                    }
                },
                '(roles, resources)': {
                    topic: function(acl){
                        acl = acl();
                        acl.revoke('guest', '/page');
                        acl.revoke(['user', 'admin'], '/profile');
                        acl.revoke(['demo', 'user'], ['/article', '/blog']);
                        acl.revoke('not existent', '/page');
                        return acl;
                    },

                    'grants object sane': function(acl){
                        assert.deepEqual(acl.grants, {
                            guest: {}, // now empty
                            anonymous: {
                                '/page': ['read']
                            },
                            demo: {},
                            user: {
                                '/page': ['create', 'read', 'edit', 'delete']
                            },
                            admin: {
                                '/page': ['create', 'read', 'edit', 'delete'],
                                '/admin': ['open', 'manage']
                            }
                        });
                    }
                },
                '(roles, resources, permissions)': {
                    topic: function(acl){
                        acl = acl();
                        acl.revoke(['anonymous', 'guest'], '/page', 'read');
                        acl.revoke('demo', ['/article', '/blog'], ['vote']);
                        acl.revoke(['user', 'admin'], ['/profile', '/article'], ['create', 'delete']);
                        acl.revoke('admin', '/admin', 'manage');
                        return acl;
                    },

                    'grants object sane': function(acl){
                        assert.deepEqual(acl.grants, {
                            guest: {},
                            anonymous: {},
                            demo: {},
                            user: {
                                '/profile': ['edit'],
                                '/article': ['edit'],
                                '/page': ['create', 'read', 'edit', 'delete']
                            },
                            admin: {
                                '/page': ['create', 'read', 'edit', 'delete'],
                                '/admin': ['open']
                            }
                        });
                    }
                },
                '(roles, grants)': {
                    topic: function(acl){
                        acl = acl();
                        acl.revoke(['anonymous', 'guest'], { '/page': ['read'] });
                        acl.revoke('demo', { '/article': ['vote'], '/blog': ['vote'] });
                        acl.revoke(['user', 'admin'], {'/profile': ['create', 'delete'], '/article': ['create', 'delete']});
                        acl.revoke('admin', { '/admin': ['manage'] });
                        return acl;
                    },

                    'grants object sane': function(acl){
                        assert.deepEqual(acl.grants, {
                            guest: {},
                            anonymous: {},
                            demo: {},
                            user: {
                                '/profile': ['edit'],
                                '/article': ['edit'],
                                '/page': ['create', 'read', 'edit', 'delete']
                            },
                            admin: {
                                '/page': ['create', 'read', 'edit', 'delete'],
                                '/admin': ['open']
                            }
                        });
                    }
                }
            },

            'authorize': {
                topic: function(acl){
                    return acl();
                }
                // TODO: authorization tests
            },

            'show': {
                topic: function(acl){
                    return acl();
                }
                // TODO: show tests
            }
        }
    })
    .export(module);
