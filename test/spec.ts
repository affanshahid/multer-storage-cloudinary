import { v2 as cloudinary } from 'cloudinary';
import FormData from 'form-data';
import multer from 'multer';
import superagent from 'superagent';
import { CloudinaryStorage } from '../src';
import { getImageStream, runMiddleware } from './util';

const FOLDER = 'multer_tests';

describe('CloudinaryStorage', () => {
  afterEach(async () => {
    await cloudinary.api.delete_resources_by_prefix(FOLDER + '/', {});
  }, 15_000);

  it('uploads files', async () => {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: { folder: FOLDER },
    });
    const parser = multer({ storage }).array('images');

    const form = new FormData();
    form.append('images', getImageStream());
    form.append('images', getImageStream());

    const req = await runMiddleware(parser, form);

    expect(req.files).not.toBeUndefined();
    expect(req.files).toHaveLength(2);

    const promises = req.files!.map((file) => superagent.get(file.path));
    const responses = await Promise.all(promises);

    for (const res of responses) {
      expect(res.status).toBe(200);
    }
  }, 15_000);

  it('works with static params', async () => {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: { folder: FOLDER, format: 'jpeg' },
    });
    const parser = multer({ storage }).single('image');

    const form = new FormData();
    form.append('image', getImageStream());

    const req = await runMiddleware(parser, form);
    expect(req.file).not.toBeUndefined();

    const res = await superagent.get(req.file!.path);
    expect(res.status).toBe(200);
    expect(res.get('Content-Type')).toBe('image/jpeg');
  }, 15_000);

  it('works with functional params', async () => {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: (req, file) => {
          expect(req).toBeDefined();
          expect(file).toBeDefined();
          return FOLDER;
        },
        format: (req, file) => {
          expect(req).toBeDefined();
          expect(file).toBeDefined();
          return 'jpeg';
        },
      },
    });
    const parser = multer({ storage }).single('image');

    const form = new FormData();
    form.append('image', getImageStream());

    const req = await runMiddleware(parser, form);
    expect(req.file).not.toBeUndefined();
    expect(req.file!.path).toContain(FOLDER + '/');

    const res = await superagent.get(req.file!.path);
    expect(res.status).toBe(200);
    expect(res.get('Content-Type')).toBe('image/jpeg');
  }, 15_000);

  it('works with async functional params', async () => {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: {
        folder: (req, file) => {
          return new Promise((resolve) => {
            expect(req).toBeDefined();
            expect(file).toBeDefined();
            resolve(FOLDER);
          });
        },
        format: async (req, file) => {
          expect(req).toBeDefined();
          expect(file).toBeDefined();
          return 'jpeg';
        },
      },
    });
    const parser = multer({ storage }).single('image');

    const form = new FormData();
    form.append('image', getImageStream());

    const req = await runMiddleware(parser, form);
    expect(req.file).not.toBeUndefined();
    expect(req.file!.path).toContain(FOLDER + '/');

    const res = await superagent.get(req.file!.path);
    expect(res.status).toBe(200);
    expect(res.get('Content-Type')).toBe('image/jpeg');
  }, 15_000);

  it('removes uploaded files on error', async () => {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: { folder: FOLDER, format: 'jpeg' },
    });
    const parser = multer({ storage }).single('image');

    const form = new FormData();
    form.append('incorrect', getImageStream());

    try {
      await runMiddleware(parser, form);
    } catch {
      const { resources } = await cloudinary.api.resources({
        type: 'upload',
        prefix: FOLDER + '/',
      });

      expect(resources).toBeDefined();
      expect(resources).toHaveLength(0);
    }
  }, 15_000);

  it('throws when `cloudinary` is not provided', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => new CloudinaryStorage()).toThrow();
  });
});
