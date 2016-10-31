'use strict';

const co = require('co');
const os = require('os');
const fsp = require('fs-promise');
const bytes = require('bytes');

const file = require('./file');
const { reqToFile } = require('./writer');
const debuglog = require('./debug');

function cast(maxSize) {
  return (typeof maxSize === 'string') ? bytes.parse(maxSize) :  maxSize;
}

/** The uploader: load data in a tmp file,if succeeded move the file to the uploadDir,
if fail delete the file*/
module.exports = function({maxSize, tmpDir=os.tmpdir(), uploadDir, type}) {
  const actualMaxSize = cast(maxSize);
  return {
    upload(req) {
      return co(function*() {
        let intFile;
        try {
          yield Promise.all([fsp.ensureDir(tmpDir), fsp.ensureDir(uploadDir)]);
          intFile = yield file.getInternalFile({ req, maxSize:actualMaxSize, type, filePath: tmpDir});
          yield reqToFile(req, intFile);
          yield intFile.moveAsync(uploadDir);
          return intFile.getResultFile();
        } catch (err) {
          debuglog(err);
          if (intFile) {
            try {
              yield intFile.deleteAsync();
            } catch (deletionErr) {
              /* the first error matter, not this one */
              debuglog('While deleting the file', deletionErr);
            }
          }
          throw err;
        }
      });
    }
  };
}
