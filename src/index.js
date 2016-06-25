class CloudinaryStorage {

  constructor(opts) {
    if (!opts || !opts.cloudinary)
      throw new Error('`cloudinary` option required');
    this.cloudinary = opts.cloudinary;
    this.getFolder = opts.folder || this._noop;
    this.getFilename = opts.filename || this._noop;
  }

  _handleFile(req, file, cb) {
    this.getDestination(req, file, (err, folder) => {
      if (err) cb(err);
      this.getFilename(req, file, (err, filename) => {
        if (err) cb(err);

        const stream = this.cloudinary.v2.uploader.upload_stream({
          folder: folder,
          public_id: filename
        }, cb);

        file.stream.pipe(stream);
      });
    });
  }

  _removeFile(req, file, cb) {
    this.cloudinary.v2.uploader.destroy(file.file_id, { invalidate: true }, cb);
  }

  _noop(_, __, cb) {
    cb();
  }

  _retStatic(val) {
    return function (_, __, cb) {
      cb(null, val);
    };
  }
}

module.exports = function (opts) {
  return new CloudinaryStorage(opts);
};
