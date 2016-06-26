/*eslint-env mocha*/
import multer from 'multer';
import cloudinary from 'cloudinary';
import cloudinaryStorage from '../src';
import { createReadStream } from 'fs';
import { submitForm } from './support/util';
import { expect } from 'chai';
import FormData from 'form-data';
import superagent from 'superagent';

describe('Cloundinary Storage', () => {
  const folder = 'multer_tests';
  const invalidArgsMap = {
    filename: 'string',
    folder: [1, 2, 3],
    transformation: [1, 2, 3],
    format: 1,
    allowedFormats: 'string',
    params: 1
  };
  const validArgsMap = {
    filename: () => {},
    folder: 'string',
    transformation: 'string',
    format: 'string',
    allowedFormats: ['jpg', 'png'],
    params: {}
  };

  afterEach(function (done) {
    this.timeout(10000);
    cloudinary.api.delete_resources_by_prefix(folder + '/', () => {
      done();
    });
  });

  it('uploads files', function (done) {
    this.timeout(10000);
    const storage = cloudinaryStorage({ cloudinary, folder });
    const parser = multer({ storage }).array('images', 2);
    const form = new FormData();
    form.append('images', createReadStream('./test/fixtures/dot.png'));
    form.append('images', createReadStream('./test/fixtures/dot.png'));
    submitForm(parser, form, (err, req) => {
      expect(err).to.not.be.ok;
      expect(req).to.be.ok;
      expect(req.files).to.have.length(2);
      superagent.get(req.files[0].url, (err, res) => {
        expect(err).to.not.be.ok;
        expect(res).to.be.ok;
        expect(res.status).to.equal(200);
        superagent.get(req.files[1].url, (err, res) => {
          expect(err).to.not.be.ok;
          expect(res).to.be.ok;
          expect(res.status).to.equal(200);
          done();
        });
      });
    });
  });

  it('works with static params', function (done) {
    this.timeout(10000);
    const storage = cloudinaryStorage({
      cloudinary,
      folder,
      format: 'jpg',
      type: 'private'
    });
    const parser = multer({ storage }).single('image');
    const form = new FormData();
    form.append('image', createReadStream('./test/fixtures/dot.png'));
    submitForm(parser, form, (err, req) => {
      expect(err).to.not.be.ok;
      expect(req).to.be.ok;
      expect(req.file).to.be.ok;
      expect(req.file.format).to.equal('jpg');
      expect(req.file.type).to.equal('private');
      superagent.get(req.file.url, (err, res) => {
        expect(err).to.not.be.ok;
        expect(res).to.be.ok;
        expect(res.status).to.equal(200);
        done();
      });
    });
  });

  it('works with functional params', function (done) {
    this.timeout(10000);
    const storage = cloudinaryStorage({
      cloudinary,
      folder: (req, file, cb) => {
        expect(req).to.be.ok;
        expect(file).to.be.ok;
        cb(undefined, folder);
      },
      format: (req, file, cb) => {
        expect(req).to.be.ok;
        expect(file).to.be.ok;
        cb(undefined, 'jpg');
      },
      type: (req, file, cb) => {
        expect(req).to.be.ok;
        expect(file).to.be.ok;
        cb(undefined, 'private');
      }
    });
    const parser = multer({ storage }).single('image');
    const form = new FormData();
    form.append('image', createReadStream('./test/fixtures/dot.png'));
    submitForm(parser, form, (err, req) => {
      expect(err).to.not.be.ok;
      expect(req).to.be.ok;
      expect(req.file).to.be.ok;
      expect(req.file.format).to.equal('jpg');
      expect(req.file.type).to.equal('private');
      superagent.get(req.file.url, (err, res) => {
        expect(err).to.not.be.ok;
        expect(res).to.be.ok;
        expect(res.status).to.equal(200);
        done();
      });
    });
  });

  it('removes uploaded files on error', function (done) {
    this.timeout(10000);
    const storage = cloudinaryStorage({
      cloudinary,
      folder,
      format: 'jpg',
      type: 'private'
    });
    const parser = multer({ storage }).single('image');
    const form = new FormData();
    form.append('incorrect', createReadStream('./test/fixtures/dot.png'));
    submitForm(parser, form, function (err, req) {
      expect(req.file).to.not.be.ok;
      expect(err.code).to.equal('LIMIT_UNEXPECTED_FILE');
      expect(err.field).to.equal('incorrect');

      cloudinary.api.resources(function (res) {
        expect(res).to.be.ok;
        expect(res.resources).to.have.length(0);
        done();
      }, {
        type: 'upload',
        prefix: folder + '/'
      });
    });
  });

  it('throws when \'cloudinary\' is not supplied', () => {
    expect(() => {
      cloudinaryStorage();
    }).to.throw();
  });

  for (let param in invalidArgsMap) {
    it(`throws when an invalid argument is supplied to '${param}'`, () => {
      expect(() => {
        const opts = { cloudinary };
        opts[param] = invalidArgsMap[param];
        cloudinaryStorage(opts);
      }).to.throw();
    });
  }

  for (let param in validArgsMap) {
    it(`does not throw when a valid argument is supplied to '${param}'`, () => {
      expect(() => {
        const opts = { cloudinary };
        opts[param] = validArgsMap[param];
        cloudinaryStorage(opts);
      }).to.not.throw();
    });
  }

});
