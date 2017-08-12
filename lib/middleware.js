'use strict';

const uploaderFactory = require('./uploader');

/** Returns a nw uploader*/
module.exports = function middlewareFactory(config = {}) {
  const uploader = uploaderFactory(config);

  return (req, res, next) => {
    // Calls the uploader and set thre result in req.x_file
    uploader.upload(req)
      .then(file => {
        req.x_file = file
        next();
      }).catch(err => {
        next(err);
      });
  };
};
