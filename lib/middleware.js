'use strict';

const uploadHOF = require('./upload');

/** Returns a nw uploader*/
module.exports = function middlewareFactory(config = {}) {
  const upload = uploadHOF(config);

  return async (req, res, next) => {
    try {
      // Calls the uploader and set thre result in req.x_file
      const file = await upload(req);
      req.x_file = file
      next();
    } catch (err) {
      next(err);
    }
  };
};
