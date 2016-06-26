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
    this.getAllowedFormats = this._getParamGetter('allowedFormats', 'object',
      opts);
  }

  _getParamGetter(name, type, opts) {
    let param;
    if (typeof opts[name] === 'function') {
      param = opts[name];
    } else if (type && typeof opts[name] === type) {
      param = this._staticVal(opts[name]);
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
        this.getParams.bind(this, req, file),
        this.getFolder.bind(this, req, file),
        this.getFilename.bind(this, req, file),
        this.getTransformation.bind(this, req, file),
        this.getType.bind(this, req, file),
        this.getFormat.bind(this, req, file),
        this.getAllowedFormats.bind(this, req, file)
      ],
      (err, results) => {
        const params = results[0] || {
          folder: results[1],
          public_id: results[2],
          transformation: results[3],
          type: results[4],
          format: results[5],
          allowed_formats: results[6]
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
// not using 'export default' to allow compatibility with es5 require
module.exports = function (opts) {
  return new CloudinaryStorage(opts);
};
