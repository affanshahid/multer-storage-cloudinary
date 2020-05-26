import Cloudinary, { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import type { Request } from 'express';
import type { StorageEngine } from 'multer';

type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends { [_ in keyof T]: infer U }
  ? U
  : never;

type File = Express.Multer.File;
type PickedUploadApiOptions = Pick<
  UploadApiOptions,
  KnownKeys<UploadApiOptions>
>;

export type OptionCallback<T> = (req: Request, file: File) => Promise<T> | T;

type CloudinaryStorageUploadOptionsWithoutPublicId = {
  [key in keyof PickedUploadApiOptions]:
    | OptionCallback<PickedUploadApiOptions[key]>
    | PickedUploadApiOptions[key];
};

type CloudinaryStorageUploadOptions = CloudinaryStorageUploadOptionsWithoutPublicId & {
  public_id?: OptionCallback<string>;
};

type Params =
  | CloudinaryStorageUploadOptions
  | OptionCallback<PickedUploadApiOptions>;

export interface Options {
  cloudinary: typeof Cloudinary;
  params?: Params;
}

export class CloudinaryStorage implements StorageEngine {
  private cloudinary: typeof Cloudinary;
  private params: Params;

  constructor(opts: Options) {
    if (opts == null || opts.cloudinary == null) {
      throw new Error('`cloudinary` option required');
    }

    this.cloudinary = opts.cloudinary;
    this.params = opts.params ?? {};
  }

  async _handleFile(
    req: Request,
    file: File,
    callback: (error?: any, info?: Partial<File>) => void
  ): Promise<void> {
    try {
      let uploadOptions: PickedUploadApiOptions;

      if (typeof this.params === 'function') {
        uploadOptions = await this.params(req, file);
      } else {
        const { public_id, ...otherParams } = this.params;
        uploadOptions = { public_id: await public_id?.(req, file) };

        for (const untypedKey in otherParams) {
          const key = untypedKey as keyof typeof otherParams;
          const getterOrValue = otherParams[key];

          const value =
            typeof getterOrValue === 'function'
              ? getterOrValue(req, file)
              : getterOrValue;

          uploadOptions[key] = value;
        }
      }

      const resp = await this.upload(uploadOptions, file);
      callback(undefined, {
        path: resp.secure_url,
        size: resp.bytes,
        filename: resp.public_id,
      });
    } catch (err) {
      callback(err);
    }
  }

  _removeFile(
    req: Request,
    file: File,
    callback: (error: Error) => void
  ): void {
    this.cloudinary.v2.uploader.destroy(
      file.filename,
      { invalidate: true },
      callback
    );
  }

  private upload(
    opts: PickedUploadApiOptions,
    file: File
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.v2.uploader.upload_stream(
        opts,
        (err, response) => {
          if (err != null) return reject(err);
          return resolve(response);
        }
      );

      file.stream.pipe(stream);
    });
  }
}

export function createCloudinaryStorage(opts: Options): CloudinaryStorage {
  return new CloudinaryStorage(opts);
}

export default createCloudinaryStorage;
