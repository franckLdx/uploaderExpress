'use strict';

const BadRequest = require('./badRequest');
const fsp = require('fs-promise');
const co = require('co');
const path = require('path');
const mz = require('mz');

class InternalFile {
  constructor({filePath, fileName, expectedSize}) {
    this._filePath = filePath;
    this._fileName = fileName;
    this._expectedSize = expectedSize;
    this._actualSize = 0;
  }

  get fullPath() {
    return path.resolve(this._filePath, this._fileName);
  }

  createWriteStream() {
    const fileStream = fsp.createWriteStream(
      this.fullPath,
      {flags: fsp.constants.O_WRONLY | fsp.constants.O_CREAT |  fsp.constants.O_EXCL}
    );
    return fileStream;
  }

  addSize(size) {
    this._actualSize += size;
    if (this._expectedSize !== undefined && this._actualSize>this._expectedSize) {
      throw new BadRequest(`data content is bigger than the maximum alowed size (${this._expectedSize}): upload is aborted.`);
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
}

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

function getExpectedSize(req, maxSize) {
  const contentLength = req.get('content-length');
  const declaredSize = contentLength ? parseInt(contentLength) : undefined;
  if (maxSize!==undefined && declaredSize!=undefined && declaredSize>maxSize) {
    throw new BadRequest(`Content-length is bigger than the maximum alowed size. content-length:${declaredSize},maximum:${maxSize}`);
  }
  return declaredSize!==undefined ? declaredSize : maxSize;
}

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
