var vows = require('vows'),
    _ = require('lodash'),
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
                    assert.deepEqual(acl.listPermissions('user'), ['create', 'delete', 'read', 'update']);
                    assert.deepEqual(acl.listPermissions('event'), ['create']);
                    assert.deepEqual(acl.listPermissions('log'), ['delete']);
                    // listPermissions() works fine
                    assert.deepEqual(acl.listPermissions(['log', 'event']), ['delete', 'create']);
                    assert.deepEqual(acl.listPermissions(['event', 'log']), ['create', 'delete']);
                },
                'listPermissions() works fine': function(acl){
                    // All
                    assert.deepEqual(acl.listPermissions(), ['create', 'delete', 'read', 'update']);
                    // Invalid -> nothing
                    assert.deepEqual(acl.listPermissions(':)'), []);
                    // array ok
                    assert.deepEqual(acl.listPermissions('user'), ['create', 'delete', 'read', 'update']);
                    // duplicates removed
                    assert.deepEqual(acl.listPermissions(['user', 'user']), ['create', 'delete', 'read', 'update']);
                },
                'list() works fine': function(acl){
                    // All
                    assert.deepEqual(acl.list(), { user: ['create', 'delete', 'read', 'update'], log: ['delete'], event: ['create'] });
                    // Invalid -> nothing
                    assert.deepEqual(acl.list(':)'), []);
                    // array ok
                    assert.deepEqual(acl.list('user'), { user: ['create', 'delete', 'read', 'update'] });
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
                    assert.deepEqual(acl.list(), { user: ['c', 'd', 'r', 'u'], log: ['d'], event: ['c'] });
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
                        '/admin': ['open', 'manage']
                    });
                    acl.grant({ // duplicates, but tests grant({...}) footprint
                        'admin': {
                            '/admin': ['open', 'manage']
                        },
                        'user': {
                            '/page': ['create', 'read']
                        }
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
                    assert.deepEqual( acl.listPermissions('/page') , ['create', 'delete', 'edit', 'read']);
                    assert.deepEqual( acl.listPermissions('/article') , ['create', 'edit', 'vote']);
                    assert.deepEqual( acl.listPermissions('/blog') , ['vote']);
                    assert.deepEqual( acl.listPermissions('/profile') , ['create', 'delete', 'edit']);
                    assert.deepEqual( acl.listPermissions('/admin') , ['manage', 'open']);
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
                            '/profile': ['create', 'delete', 'edit'],
                            '/article': ['create', 'edit'],
                            '/page': ['create', 'delete', 'edit', 'read']
                        },
                        admin: {
                            '/page': ['create', 'delete', 'edit', 'read'],
                            '/admin': ['manage', 'open'],
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
                                '/page': ['create', 'delete', 'edit', 'read']
                            },
                            admin: {
                                '/page': ['create', 'delete', 'edit', 'read'],
                                '/admin': ['manage', 'open']
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
                                '/page': ['create', 'delete', 'edit', 'read']
                            },
                            admin: {
                                '/page': ['create', 'delete', 'edit', 'read'],
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
                                '/page': ['create', 'delete', 'edit', 'read']
                            },
                            admin: {
                                '/page': ['create', 'delete', 'edit', 'read'],
                                '/admin': ['open']
                            }
                        });
                    }
                }
            },

            'authorize': {
                topic: function(acl){
                    return acl();
                },

                'check()': function(acl){
                    // check(roles)
                    assert.equal(acl.check('user'), true);
                    assert.equal(acl.check(['user', 'demo']), true);
                    assert.equal(acl.check('nOn-eXistEnt'), false);
                    assert.equal(acl.check(['user', 'nOn-eXistEnt']), false);
                    // check(roles, resources)
                    assert.equal(acl.check('user', '/page'), true);
                    assert.equal(acl.check('user', ['/page', '/article']), true);
                    assert.equal(acl.check(['user', 'admin'], ['/page', '/profile']), true);
                    assert.equal(acl.check(['user', 'admin'], []), true);
                    assert.equal(acl.check('user', '/0'), false);
                    assert.equal(acl.check('user', ['/page', '/0']), false);
                    assert.equal(acl.check(['user', '0'], ['/page', '/profile']), false);
                    assert.equal(acl.check(['user', 'admin'], ['/page', '/0']), false);
                    // check(roles, resources, permissions)
                    assert.equal(acl.check('user', '/page', 'read'), true);
                    assert.equal(acl.check('user', '/page', ['read', 'edit']), true);
                    assert.equal(acl.check('user', ['/page', '/profile'], ['create', 'delete']), true);
                    assert.equal(acl.check(['user', 'admin'], ['/page', '/profile'], ['create', 'delete']), true);
                    assert.equal(acl.check('user', '/page', '0'), false);
                    assert.equal(acl.check('user', '/0', ['read', 'edit']), false);
                    assert.equal(acl.check('user', '/page', ['read', '0']), false);
                    assert.equal(acl.check('user', ['/page', '/profile'], ['create', '0']), false);
                    assert.equal(acl.check(['user', 'admin'], ['/page', '/profile'], ['create', '0']), false);
                    // check(roles, grants)
                    assert.equal(acl.check('user', { '/page': 'read' }), true);
                    assert.equal(acl.check('user', { '/page': ['read'] }), true);
                    assert.equal(acl.check('user', { '/page': ['read', 'edit'] }), true);
                    assert.equal(acl.check(['user', 'admin'], { '/page': ['create', 'delete'], '/profile': ['create', 'delete'] }), true);
                    assert.equal(acl.check('user', { '/0': ['read'] }), false);
                    assert.equal(acl.check('user', { '/page': ['read', '0'] }), false);
                    assert.equal(acl.check(['user', 'admin'], { '/page': ['create', '0'], '/profile': ['create', 'delete'] }), false);
                },

                'checkAny()': function(acl){
                    // check(roles)
                    assert.equal(acl.checkAny('user'), true);
                    assert.equal(acl.checkAny('n0n'), false);
                    assert.equal(acl.checkAny(['user', 'n0n']), true);
                    // check(roles, resources)
                    assert.equal(acl.checkAny('user', '/page'), true);
                    assert.equal(acl.checkAny('user', ['/page', '/article']), true);
                    assert.equal(acl.checkAny(['user', 'admin'], ['/page', '/profile']), true);
                    assert.equal(acl.checkAny(['user', 'admin'], []), true);
                    assert.equal(acl.checkAny(['user', '0'], []), true);
                    assert.equal(acl.checkAny('user', '/0'), false);
                    assert.equal(acl.checkAny('user', ['/page', '/0']), true);
                    assert.equal(acl.checkAny(['user', '0'], ['/page', '/profile']), true);
                    assert.equal(acl.checkAny(['user', 'admin'], ['/page', '/0']), true);
                    assert.equal(acl.checkAny(['user', 'admin'], ['/0']), false);
                    // check(roles, resources, permissions)
                    assert.equal(acl.checkAny('user', '/page', 'read'), true);
                    assert.equal(acl.checkAny('user', '/page', ['read', 'edit']), true);
                    assert.equal(acl.checkAny('user', ['/page', '/profile'], ['create', 'delete']), true);
                    assert.equal(acl.checkAny(['user', 'admin'], ['/page', '/profile'], ['create', 'delete']), true);
                    assert.equal(acl.checkAny('user', '/page', '0'), false);
                    assert.equal(acl.checkAny('user', '/0', ['read', 'edit']), false);
                    assert.equal(acl.checkAny('user', '/page', ['read', '0']), true);
                    assert.equal(acl.checkAny('user', ['/page', '/profile'], ['create', '0']), true);
                    assert.equal(acl.checkAny(['user', 'admin'], ['/page', '/profile'], ['create', '0']), true);
                    // check(roles, grants)
                    assert.equal(acl.checkAny('user', { '/page': 'read' }), true);
                    assert.equal(acl.checkAny('user', { '/page': ['read'] }), true);
                    assert.equal(acl.checkAny('user', { '/page': ['read', 'edit'] }), true);
                    assert.equal(acl.checkAny(['user', 'admin'], { '/page': ['create', 'delete'], '/profile': ['create', 'delete'] }), true);
                    assert.equal(acl.checkAny('user', { '/0': ['read'] }), false);
                    assert.equal(acl.checkAny('user', { '/page': ['read', '0'] }), true);
                    assert.equal(acl.checkAny(['user', 'admin'], { '/page': ['create', '0'], '/profile': ['create', 'delete'] }), true);
                }
            },

            'show': {
                topic: function(){
                    var acl = new miracle.Acl();
                    acl.grant('user', '/page', ['read']);
                    acl.grant('author', '/page', ['read', 'create']);
                    acl.grant('author', '/blog', ['read']);
                    acl.grant('admin', '/page', ['delete', 'edit']);
                    acl.grant('admin', '/blog', ['read', 'post']);
                    return acl;
                },

                'which()': function(acl){
                    assert.deepEqual(acl.which('admin'), acl.show('admin').admin);
                    assert.deepEqual(acl.which(['admin', 'n0n']), {});
                    assert.deepEqual(acl.which(['user', 'author']), {
                        '/page': ['read']
                    });
                    assert.deepEqual(acl.which(['author', 'admin']), {
                        '/blog': ['read']
                    });
                    assert.deepEqual(acl.which(['user', 'author', 'admin']), {});
                },
                'whichAny()': function(acl){
                    assert.deepEqual(acl.whichAny('admin'), acl.show('admin').admin);
                    assert.deepEqual(acl.whichAny(['admin', 'n0n']), acl.show('admin').admin);
                    assert.deepEqual(acl.whichAny(['user', 'author']), {
                        '/page': ['create', 'read'],
                        '/blog': ['read']
                    });
                    assert.deepEqual(acl.whichAny(['author', 'admin']), {
                        '/page': ['create', 'delete', 'edit', 'read'],
                        '/blog': ['post', 'read']
                    });
                    assert.deepEqual(acl.whichAny(['user', 'author', 'admin']), {
                        '/page': ['create', 'delete', 'edit', 'read'],
                        '/blog': ['post', 'read']
                    });
                },
                'show()': function(acl){
                    assert.deepEqual(acl.show('n0n'), {});
                    assert.deepEqual(acl.show(['user', 'n0n']), {
                        user: { '/page': ['read'] }
                    });
                    assert.deepEqual(acl.show(), acl.grants);
                }
            },

            'remove*()': {
                topic: function(acl){
                    acl = acl();
                    acl.removeRole(['anonymous', 'guest']);
                    acl.removeResource('/profile');
                    acl.removePermission(['/blog', '/page', '/admin'], ['delete', 'vote', 'create', 'manage']);
                    return acl;
                },

                'removed ok': function(acl){
                    assert.deepEqual(acl.show(), {
                        demo: {
                            '/article': ['vote']
                        },
                        user: {
                            '/article': ['create', 'edit'],
                            '/page': ['edit', 'read']
                        },
                        admin: {
                            '/admin': ['open'],
                            '/page': ['edit', 'read']
                        }
                    });
                }
            }
        }
    })
    .export(module);
