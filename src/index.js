import runParallel from 'run-parallel';
class CloudinaryStorage {

  constructor(opts) {
    if (!opts || !opts.cloudinary)
      throw new Error('`cloudinary` option required');
    this.cloudinary = opts.cloudinary;
    this.getFilename = opts.filename || this._noop;

    if (typeof opts.folder === 'string') {
      this.getFolder = this._staticVal(opts.folder);
    } else if (typeof opts.folder === 'function') {
      this.getFolder = opts.folder;
    } else {
      this.getFolder = this._noop;
    }
  }

  _handleFile(req, file, cb) {

    runParallel(
      [
        this.getFolder,
        this.getFilename
      ],
      (err, results) => {
        const stream = this.cloudinary.v2.uploader.upload_stream({
          folder: results[0],
          public_id: results[1]
        }, cb);

        file.stream.pipe(stream);
      });
  }

  _removeFile(req, file, cb) {
    this.cloudinary.v2.uploader.destroy(file.file_id, { invalidate: true }, cb);
  }

  _noop(_, __, cb) {
    cb();
  }

  _staticVal(val) {
    return function (_, __, cb) {
      cb(null, val);
    };
  }
}

module.exports = function (opts) {
  return new CloudinaryStorage(opts);
};
