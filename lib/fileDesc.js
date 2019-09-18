'use strict';

const { BadRequest, RequestTooLarge } = require('./errors');
const fsp = require('fs-extra');
const path = require('path');
const mz = require('mz');

/** Returns a new InternalFile */
module.exports.getFileDesc = async ({ req, maxSize, filePath, type, generateFileName = getRandomFileName }) => {
  const expectedSize = getExpectedSize(req, maxSize);
  const fileName = await generateFileName(req, type);
  const fullPath = path.resolve(filePath, fileName);
  return {
    fullPath,
    filePath,
    fileName,
    expectedSize,
  };
}

module.exports.move = async (newPath, fileDesc) => {
  const dstFullPath = path.resolve(newPath, fileDesc.fileName);
  await fsp.move(fileDesc.fullPath, dstFullPath, { clobber: false });
  return { ...fileDesc, fullPath: dstFullPath, filePath: newPath };
}

/** Generate a random file name */
const getRandomFileName = async (req, type) => {
  const bytes = await mz.crypto.randomBytes(5);
  let randomName = bytes.toString('hex');
  if (type) {
    randomName += `.${type}`;
  }
  return randomName;
}

/** Analyse the request to find the file size. Ensure this the maximum
file size is not exceeded. */
const getExpectedSize = (req, maxSize) => {
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
