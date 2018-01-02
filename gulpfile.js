let gulp = require('gulp')
let browserSync = require('browser-sync').create()

// 静态服务器
gulp.task('browser-sync', function () {
  browserSync.init({
    server: {
      baseDir: "./example"
    }
  });
});

gulp.task('default', ['browser-sync'])
