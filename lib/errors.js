'use strict';

module.exports.BadRequest = class {
  constructor(message) {
    this.status = 400;
    this.message = message;
  }
}
