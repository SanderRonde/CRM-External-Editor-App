module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		minified: {
			files: {
				src: [
					'app/js/*.js'
				],
				dest: 'build/js/'
			}
		},
		clean: {
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
						cwd: 'app/',
						src: ['html/main.html', 'html/notice.html'],
						dest: 'build/'
					}, {
						expand: true,
						cwd: 'app/',
						src: '*.png',
						dest: 'build/'
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
		}
	});

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-minified');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-banner');
	grunt.loadNpmTasks('grunt-zip');
	grunt.loadNpmTasks('grunt-vulcanize');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-processhtml');

	grunt.registerTask('build', ['clean:cleanFolder', 'minified', 'cssmin', 'copy', 'usebanner', 'zip']);
	grunt.registerTask('clear', ['clean:cleanFolder']);
}