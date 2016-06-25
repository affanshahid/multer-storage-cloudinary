import { PassThrough } from 'stream';

export function submitForm(multer, form, cb) {
  form.getLength(function (err, length) {
    if (err) return cb(err);

    var req = new PassThrough();

    form.pipe(req);
    req.headers = {
      'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
      'content-length': length
    };

    multer(req, null, err => {
      cb(err, req);
    });
  });
}
