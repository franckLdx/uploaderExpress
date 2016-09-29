'use strict';

const co = require('co');

const uploaderFactory = require('./lib/uploader');

module.exports = function middlewareFactory(config={}) {
  const uploader = uploaderFactory(config);

  return (req, res, next) => {
    co(function *() {
      try {
        const file = yield uploader.upload(req);
        req.x_file = file;
        next();
      } catch (err) {
        next(err);
      }
    });
  };
}
