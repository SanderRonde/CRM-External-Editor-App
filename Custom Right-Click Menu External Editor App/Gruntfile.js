module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		replace: {
			roboto: {
				src: 'app/bower_components_inline/paper-styles/typography.html',
				overwrite: true,
				replacements: [
					{
						from: '<link rel="import" href="../font-roboto/roboto.html">',
						to: '<link rel="stylesheet" href="../../../fonts/fonts.css" />'
					}
				]
			},
			elements: {
				src: ['app/html/elements.html'],
				dest: 'app/html/elementsInline.html',
				replacements: [
					{
						from: 'bower_components_crisp',
						to: 'bower_components_inline'
					}, {
						from: 'main-element.html',
						to: 'main-element-no-js.html'
					}
				]
			},
			noscript: {
				src: ['app/main-element/main-element.html'],
				dest: 'app/main-element/main-element-no-js.html',
				replacements: [
					{
						from: '<script src="main-element.js"></script>',
						to: ''
					}
				]
			}
		},
		vulcanize: {
			default: {
				options: {
					stripComments: true,
					csp: 'elements.js'
				},
				files: [
					{
						src: ['app/html/elementsInline.html'],
						dest: 'build/elements.html'
					}
				]
			}
		},
		concat: {
			build: {
				src: ['build/elements.js', 'app/main-element/main-element.js'],
				dest: 'build/elements.js'
			}
		},
		processhtml: {
			elements: {
				files: {
					'build/html/main.html': ['app/html/main.html']
				}
			}
		},
		minified: {
			files: {
				src: [
					'app/js/*.js',
					'build/elements.js'
				],
				dest: 'build/js/'
			}
		},
		clean: {
			build: ['app/html/elementsInline.html', 'app/main-element/main-element-no-js.html', 'build/elements.js'],
			cleanFolder: ['build/**.*', 'build/*', 'app/html/elementsInline.html', 'app/main-element/main-element-no-js.html', 'build/elements.js']
		},
		cssmin: {
			options: {
				shorthandCompacting: false
			},
			targets: {
				files: [
					{
						src: ['app/css.css'],
						dest: 'build/css.css'
					}
				]
			}
		},
		copy: {
			build: {
				files: [
					{
						expand: true,
						cwd: 'app/fonts/',
						src: ['*'],
						dest: 'build/fonts/'
					}, {
						expand: true,
						cwd: 'app/icons/',
						src: ['*.*'],
						dest: 'build/icons/'
					}, {
						expand: true,
						cwd: 'app/',
						src: ['LICENSE.txt', 'manifest.json'],
						dest: 'build/'
					}, {
						expand: true,
						cwd: 'app/html/',
						src: ['notice.html'],
						dest: 'build/html/'
					}, {
						expand: true,
						cwd: 'app/',
						src: ['elements.html'],
						dest: 'build/html/'
					}
				]
			}
		},
		usebanner: {
			jsCssBanner: {
				options: {
					position: 'top',
					banner: '/* Non-minified original can be found at https://github.com/SanderRonde/CRM-External-Editor-App \n * This code may only be used under the MIT style license found in the LICENSE.txt in the root of this extension \n**/',
					linebreak: true,
				},
				files: {
					src: ['build/**.js', 'build/**.css']
				}
			},
			htmlBanner: {
				options: {
					position: 'top',
					banner: '<!-- Non-minified original can be found at https://github.com/SanderRonde/CRM-External-Editor-App \nThis code may only be used under the MIT style license found in the LICENSE.txt in the root of this extension -->\n',
					linebreak: true
				},
				files: {
					src: ['build/**.html']
				}
			}
		},
		zip: {
			'using-cwd': {
				cwd: 'build/',
				src: ['build/**', '!build/CRMExternalEditorApp.zip'],
				dest: 'build/CRMExternalEditorApp.zip'
			}
		},
		mkdir: {
			all: {
				options: {
					create: ['build']
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-banner');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-minified');
	grunt.loadNpmTasks('grunt-mkdir');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-processhtml');
	grunt.loadNpmTasks('grunt-vulcanize');
	grunt.loadNpmTasks('grunt-zip');

	grunt.registerTask('build', ['clean:cleanFolder', 'mkdir', 'replace', 'vulcanize', 'concat', 'processhtml', 'minified', 'clean:build', 'cssmin', 'copy', 'usebanner', 'zip']);
	grunt.registerTask('clear', ['clean:cleanFolder']);
}