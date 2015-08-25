module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        config: grunt.file.readJSON('config.json'),
        concat: {
            dist: {
                dest: 'dist/<%= pkg.name %>.js',
                src: ['src/**.js']
            }
        },
        uglify: {
            dist: {
                options: {
                    banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                    sourceMap: true
                },
                files: {
                    'dist/<%= pkg.name %>.min.js': ['dist/<%= pkg.name %>.js']
                }
            }
        },
        cssmin: {
            dist: {
                options: {
                    banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
                },
                files: {
                    'dist/<%= pkg.name %>.min.css': ['src/<%= pkg.name %>.css']
                }
            }
        },
        ngtemplates: {
            rfs: {
                options: {
                    htmlmin: {
                        collapseBooleanAttributes: true,
                        collapseWhitespace: true,
                        removeAttributeQuotes: true,
                        removeComments: true, // Only if you don't use comment directives!
                        removeEmptyAttributes: true,
                        removeRedundantAttributes: true,
                        removeScriptTypeAttributes: true,
                        removeStyleLinkTypeAttributes: true
                    },
                    concat: 'dist'
                },
                cwd: 'src',
                src: 'templates/**.html',
                dest: 'src/templates.js'
            }
        },
        watch: {
            scripts: {
                files: ['src/**.js', 'src/templates/**.html', 'src/kosgis-rfs.css'],
                tasks: ['default'],
                options: {
                    spawn: false,
                },
            },
        },
        'couch-compile': {
            "rfs2": {
                files: {
                    'tmp/leaflet.json': ['couchdb']
                }
            }
        },
        'couch-push': {

            "deploy": {
                options: {
                    user: '<%= config.couchdb.user %>',
                    pass: '<%= config.couchdb.password %>'
                },
                files: {
                    'http://data.kosgis.dk/couchdb/app-d2121ee08caf832b73a160f9ea022ad9': 'tmp/leaflet.json'
                }
            },
            "local": {
                options: {
                    user: '<%= config.local.user %>',
                    pass: '<%= config.local.password %>'
                },
                files: {
                    'http://localhost:5984/app-3495ccf8aafcb1541a0ef7cc2d01178e': 'tmp/leaflet.json'
                }
            }
        },
        copy: {
            dist: {
                expand: true,
                cwd: 'dist',
                src: '**/*',
                dest: 'couchdb/_attachments'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-angular-templates');
    grunt.loadNpmTasks('grunt-couch');

    // Default task(s).
    grunt.registerTask('default', ['ngtemplates', 'concat', 'uglify', 'cssmin', 'copy']);
    grunt.registerTask('deploy', ['couch-compile', 'couch-push:deploy']);
};
