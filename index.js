'use strict';

const uploaderFactory = require('./lib/upload');
const middlewareFactory = require('./lib/middleware');

module.exports = {
  middleware: middlewareFactory,
};
