'use strict';

const os = require('os');
const fsp = require('fs-extra');
const bytes = require('bytes');

const file = require('./file');
const { reqToFile } = require('./writer');
const debuglog = require('./debug');

function cast(maxSize) {
  return (typeof maxSize === 'string') ? bytes.parse(maxSize) : maxSize;
}

/** The uploader: load data in a tmp file,if succeeded move the file to the uploadDir,
if fail delete the file*/
module.exports = function upload({ maxSize, tmpDir = os.tmpdir(), uploadDir, type }) {
  const actualMaxSize = cast(maxSize);
  return {
    async upload (req) {
      await Promise.all([fsp.ensureDir(tmpDir), fsp.ensureDir(uploadDir)]);
      const intFile = await file.getInternalFile({
        req,
        maxSize: actualMaxSize,
        type,
        filePath: tmpDir });
      try {
        await reqToFile(req, intFile);
        await intFile.move(uploadDir);
        return intFile.getResultFile();
      } catch (err) {
        debuglog(err);
        if (intFile) {
          try {
            await intFile.delete();
          } catch (deletionErr) {
            /* the first error matter, not this one */
            debuglog('While deleting the file', deletionErr);
          }
        }
        throw err;
      }
    }
  };
};
