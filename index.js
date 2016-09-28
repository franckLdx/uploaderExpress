'use strict';

const co = require('co');

const BadRequest = require('./lib/badRequest');
const File = require('./lib/file');

const SIZE_NOT_DEFINED = -1;

function getSize(req, maxSize) {
  const declaredSize = parseInt(req.get('content-length') || SIZE_NOT_DEFINED);
  if (declaredSize>maxSize && maxSize!==SIZE_NOT_DEFINED && declaredSize!=SIZE_NOT_DEFINED) {
    throw new BadRequest(`Content-length is bigger than the maximum alowed size. content-length:${declaredSize},maximum:${maxSize}`);
  }
  return declaredSize;
}

function uploaderFactory({maxSize=SIZE_NOT_DEFINED}) {
  return {
    upload(req) {
      return co(function *() {
        const size = getSize(req, maxSize);
        const file = File.getFile({size});
        return file;
      });
    }
  };
}

function middlewareFactory(config={}) {
  return (req, res, next) => {
    co(function *() {
      try {
        const uploader = uploaderFactory(config);
        const file = yield uploader.upload(req);
        req.x_file = file;
        next();
      } catch (err) {
        next(err);
      }
    });
  };
}

module.exports = {
  uploader: uploaderFactory,
  middleware: middlewareFactory
};
