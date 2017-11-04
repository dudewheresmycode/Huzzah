module.exports = function(grunt) {


  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    less: {
      dist: {
        options: {
        },
        files: {
          'dist/style.css': 'src/less/base.less',
          'dist/message.css': 'src/less/message-base.less'
        }

      }
    },
    browserify: {
      vendor: {
        src: [],
        dest: 'dist/vendor.js',
        options: {
          require: ['jquery','angular']
        }
      },
      client: {
        src: ['src/js/app.js'],
        dest: 'dist/app.js',
        options: {
          external: ['jquery','angular']
        }
      }
    },
    watch: {
      dist: {
        tasks: ['default'],
        files: 'src/**/*',
        options: {
          interrupt: true
        }
      }
    }


  });

  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['browserify','less']);
}
