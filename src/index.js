import runParallel from 'run-parallel';
class CloudinaryStorage {

  constructor(opts) {
    if (!opts || !opts.cloudinary)
      throw new Error('`cloudinary` option required');
    this.cloudinary = opts.cloudinary;

    this.getFilename = this._getParamGetter('filename', undefined, opts);
    this.getFolder = this._getParamGetter('folder', 'string', opts);
    this.getTransformation = this._getParamGetter('transformation',
      'string', opts);
    this.getType = this._getParamGetter('type', 'string', opts);
    this.getFormat = this._getParamGetter('format', 'string', opts);
    this.getParams = this._getParamGetter('params', 'object', opts);
  }

  _getParamGetter(name, type, opts) {
    let param;
    if (typeof opts[name] === 'function') {
      param = opts.transformation;
    } else if (type && typeof opts[name] === type) {
      param = this._staticVal(opts.transformation);
    } else if (opts[name] == undefined) {
      param = this._staticVal(undefined);
    } else {
      let errTemp;
      if (type) {
        errTemp = `, 'undefined' or '${type}'`;
      } else {
        errTemp = ` or 'undefined'`;
      }
      throw new TypeError(`Expected opts.${name} to be of types 'function'` +
        errTemp);
    }
    return param;
  }

  _handleFile(req, file, cb) {

    runParallel(
      [
        this.getFolder,
        this.getFilename,
        this.getTransformation,
        this.getType,
        this.getFormat,
        this.getParams
      ],
      (err, results) => {
        const params = results[5] || {
          folder: results[0],
          public_id: results[1],
          transformation: results[2],
          type: results[3],
          format: results[4]
        };
        
        const stream = this.cloudinary.v2.uploader.upload_stream(params, cb);

        file.stream.pipe(stream);
      });
  }

  _removeFile(req, file, cb) {
    this.cloudinary.v2.uploader.destroy(file.file_id, { invalidate: true }, cb);
  }

  _staticVal(val) {
    return function (_, __, cb) {
      cb(undefined, val);
    };
  }
}

module.exports = function (opts) {
  return new CloudinaryStorage(opts);
};
