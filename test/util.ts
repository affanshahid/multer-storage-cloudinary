import { RequestHandler } from 'express';
import FormData from 'form-data';
import { createReadStream, ReadStream } from 'fs';
import { join } from 'path';
import { PassThrough } from 'stream';

class FakeRequest extends PassThrough {
  files?: Express.Multer.File[];
  file?: Express.Multer.File;
  headers: any;

  constructor(headers: any) {
    super();
    this.headers = headers;
  }
}

const IMAGE_PATH = join(__dirname, 'fixtures', 'dot.png');

export function getImageStream(): ReadStream {
  return createReadStream(IMAGE_PATH);
}

export function runMiddleware(
  middleware: RequestHandler,
  form: FormData
): Promise<FakeRequest> {
  return new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err != null) return reject(err);

      const req = new FakeRequest({
        'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
        'content-length': length,
      });

      form.pipe(req);

      middleware(req as any, {} as any, (err?: any) => {
        if (err != null) return reject(err);
        resolve(req);
      });
    });
  });
}
