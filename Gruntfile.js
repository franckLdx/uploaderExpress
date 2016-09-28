'use strict';

module.exports = function(grunt) {

    grunt.initConfig({});

    grunt.config('clean', {
      coverage: {
        src: 'coverage'
      }
    });

    grunt.config('mocha_istanbul', {
			coverage: {
				src: 'test',
				options: {
					mask: '*Test.js',
          reportFormats: ['html']
				}
			}
		});

    grunt.loadNpmTasks('grunt-contrib-clean');
		grunt.loadNpmTasks('grunt-mocha-istanbul');
		grunt.registerTask('test', ['clean:coverage','mocha_istanbul']);
};
