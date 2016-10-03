'use strict';

const co = require('co');

const uploaderFactory = require('./uploader');

module.exports = function middlewareFactory(config={}) {
  const uploader = uploaderFactory(config);

  return (req, res, next) => {
    co(function *() {
      try {
        req.x_file = yield uploader.upload(req);
        next();
      } catch (err) {
        next(err);
      }
    });
  };
}
