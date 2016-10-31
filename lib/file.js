'use strict';

const {BadRequest, RequestTooLarge} = require('./errors');
const fsp = require('fs-promise');
const co = require('co');
const path = require('path');
const mz = require('mz');

/** Manages data about the file (name, current size,...)*/
class InternalFile {
  constructor({filePath, fileName, expectedSize}) {
    this._filePath = filePath;
    this._fileName = fileName;
    this._expectedSize = expectedSize;
    this._currentSize = 0;
    this._actualSize = 0;
  }

  get fullPath() {
    return path.resolve(this._filePath, this._fileName);
  }

  incCurrentSize(size) {
    this._currentSize += size;
    if (this._expectedSize !== undefined && this._currentSize>this._expectedSize) {
      throw new RequestTooLarge(`Data content is bigger than the maximum alowed size (${this._expectedSize}): upload is aborted.`);
    }
  }

  moveAsync(newPath) {
    const that = this;
    return co(function *() {
      const newFullPath = path.resolve(newPath, that._fileName);
      yield fsp.move(that.fullPath, newFullPath, {clobber:false});
      that._filePath = newPath;
    });
  }

  deleteAsync() {
    const that = this;
    return co(function *() {
      yield fsp.unlink(that.fullPath);
    })
  }

  getResultFile() {
    if (this._expectedSize!==undefined && this._expectedSize !== this._currentSize) {
      throw new BadRequest(`data content size (${this._currentSize}) does not match the expected one (${this._expectedSize}): upload is aborted.`);
    }
    return {
      name:this._fileName,
      size:this._currentSize
    };
  }
}

/** Generate a radome file name */
function getRandomFileName(type) {
    return co(function *() {
      const bytes = yield mz.crypto.randomBytes(5);
      let randomName = bytes.toString('hex');
      if (type) {
        randomName += `.${type}`
      }
      return randomName;
    });
}

/** Analyse the request to find the file size. Ensure that the maximum
file size is not exceeded. */
function getExpectedSize(req, maxSize) {
  const contentLength = req.get('content-length');
  const declaredSize = contentLength!==undefined ? parseInt(contentLength) : undefined;
  if (maxSize!==undefined && declaredSize!==undefined && declaredSize>maxSize) {
    throw new RequestTooLarge(`Content-length is bigger than the maximum alowed size. content-length:${declaredSize},maximum:${maxSize}`);
  }
  if (declaredSize===0) {
    throw new BadRequest(`Request does not have a content to upload.`);
  }
  return declaredSize!==undefined ? declaredSize : maxSize;
}

/** Returns a new InternalFile */
module.exports.getInternalFile = ({req, maxSize, filePath, type}) => {
  return co(function *() {
    const expectedSize = getExpectedSize(req, maxSize);
    const fileName = yield getRandomFileName(type);

    return new InternalFile({
      filePath,
      fileName,
      expectedSize
    });

  });
}
