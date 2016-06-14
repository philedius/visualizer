'use strict';

var gulp = require('gulp');
var browserSync = require('browser-sync').create();

gulp.task('serve', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });

    gulp.watch('*.css', function() {
      // grab css files and send them into browserSync.stream
      // this injects the css into the page
      gulp.src('*.css')
        .pipe(browserSync.stream());
    });
    gulp.watch(['main.js', 'index.html']).on('change', browserSync.reload);
});

gulp.task('default', ['serve']);
