'use strict';

module.exports = class {
  constructor(message) {
    this.status = 400;
    this.message = message;
  }
}
