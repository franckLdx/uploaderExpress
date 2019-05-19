'use strict';

const os = require('os');
const fsp = require('fs-extra');
const bytes = require('bytes');

const file = require('./file');
const { reqToFile } = require('./writer');
const debuglog = require('./debug');
const { BadRequest } = require('./errors');

function cast(maxSize) {
  return (typeof maxSize === 'string') ? bytes.parse(maxSize) : maxSize;
}

/** The uploader: load data in a tmp file,if succeeded move the file to the uploadDir,
if fail delete the file*/
module.exports = ({ maxSize, tmpDir = os.tmpdir(), uploadDir, type }) => {
  const actualMaxSize = cast(maxSize);

  return async (req) => {
    await Promise.all([fsp.ensureDir(tmpDir), fsp.ensureDir(uploadDir)]);
    const fileDesc = await file.getFileDesc({
      req,
      maxSize: actualMaxSize,
      type,
      filePath: tmpDir,
    });
    try {
      const { size } = await reqToFile(req, fileDesc);
      if (fileDesc.expectedSize !== null && fileDesc.expectedSize < size) {
        throw new BadRequest(`Data size (${this._currentSize}) does not match the expected one (${this._expectedSize}): upload aborted.`);
      }
      const destFile = await file.move(uploadDir, fileDesc);
      return { name: destFile.name, size };
    } catch (err) {
      debuglog(err);
      if (fileDesc) {
        try {
          await fsp.unlink(this.fullPath);
        } catch (deletionErr) {
          /* the first error matter, not this one */
          debuglog('While deleting the file', deletionErr);
        }
      }
      throw err;
    }
  };
};
