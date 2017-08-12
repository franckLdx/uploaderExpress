'use strict';

const { BadRequest, RequestTooLarge } = require('./errors');
const fsp = require('fs-extra');
const path = require('path');
const mz = require('mz');

/** Manages data about the file (name, current size,...)*/
class InternalFile {
  constructor({ filePath, fileName, expectedSize }) {
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
    if (this._expectedSize !== undefined && this._currentSize > this._expectedSize) {
      throw new RequestTooLarge(`Data size is bigger than the maximum alowed size (${this._expectedSize}): upload aborted.`);
    }
  }

  async move(newPath) {
    const newFullPath = path.resolve(newPath, this._fileName);
    await fsp.move(this.fullPath, newFullPath, { clobber: false });
    this._filePath = newPath;
  }

  async delete() {
    await fsp.unlink(this.fullPath);
  }

  getResultFile() {
    if (this._expectedSize !== undefined && this._expectedSize !== this._currentSize) {
      throw new BadRequest(`Data size (${this._currentSize}) does not match the expected one (${this._expectedSize}): upload aborted.`);
    }
    return {
      name: this._fileName,
      size: this._currentSize,
    };
  }
}

/** Generate a radome file name */
async function getRandomFileName(type) {
  const bytes = await mz.crypto.randomBytes(5);
  let randomName = bytes.toString('hex');
  if (type) {
    randomName += `.${type}`;
  }
  return randomName;
}

/** Analyse the request to find the file size. Ensure this the maximum
file size is not exceeded. */
function getExpectedSize(req, maxSize) {
  const contentLength = req.get('content-length');
  const declaredSize = contentLength !== undefined ? parseInt(contentLength, 10) : undefined;
  if (maxSize !== undefined && declaredSize !== undefined && declaredSize > maxSize) {
    throw new RequestTooLarge(`Data size bigger than the maximum alowed size. Incomming size:${declaredSize},maximum:${maxSize}`);
  }
  if (declaredSize === 0) {
    throw new BadRequest('Request does not have a content to upload.');
  }
  return declaredSize !== undefined ? declaredSize : maxSize;
}

/** Returns a new InternalFile */
module.exports.getInternalFile = async ({ req, maxSize, filePath, type }) => {
  const expectedSize = getExpectedSize(req, maxSize);
  const fileName = await getRandomFileName(type);

  return new InternalFile({
    filePath,
    fileName,
    expectedSize,
  });
}