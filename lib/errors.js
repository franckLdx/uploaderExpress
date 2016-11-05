'use strict';

const HttpError = module.exports.HttpError = class {
  constructor(status, message) {
    this.status = status;
    this.message = message;
  }
};

module.exports.BadRequest = class extends HttpError {
  constructor(message) {
    super(400, message);
  }
};

module.exports.RequestTooLarge = class extends HttpError {
  constructor(message) {
    super(413, message);
  }
};

module.exports.ClientCloseRequest = class extends HttpError {
  constructor(message) {
    super(499, message);
  }
};
