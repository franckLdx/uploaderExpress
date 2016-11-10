'use strict';

const uploaderFactory = require('./lib/uploader');
const middlewareFactory = require('./lib/middleware');

module.exports = {
  uploader: uploaderFactory,
  middleware: middlewareFactory,
};
