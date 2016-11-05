'use strict';

/* eslint no-param-reassign: ["error", { "props": false }]*/
const co = require('co');

const uploaderFactory = require('./uploader');

/** Returns a nw uploader*/
module.exports = function middlewareFactory(config = {}) {
  const uploader = uploaderFactory(config);

  return (req, res, next) => {
    // Calls the uploader and set thre result in req.x_file
    co(function* uploaderFactoryCo() {
      try {
        req.x_file = yield uploader.upload(req);
        next();
      } catch (err) {
        next(err);
      }
    });
  };
};
