import gulp from 'gulp';
import babel from 'gulp-babel';
import mocha from 'gulp-mocha';

gulp.task('transpile', () => {
  return gulp.src('src/**/*.js')
    .pipe(babel())
    .pipe(gulp.dest('lib'));
});

gulp.task('copy', () => {
  return gulp.src('src/**/*.json')
    .pipe(gulp.dest('lib'));
});

gulp.task('build', ['copy', 'transpile']);

gulp.task('test', () => {
  return gulp.src('test/**/*.js')
    .pipe(mocha({
      compilers: ['js:babel-core/register']
    }));
});
