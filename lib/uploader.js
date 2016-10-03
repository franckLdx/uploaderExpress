'use strict';

const co = require('co');
const os = require('os');
const fsp = require('fs-promise');

const file = require('./file');
const { reqToFile } = require('./writer');
const debuglog = require('./debug');

module.exports = function({maxSize, tmpDir=os.tmpdir(), uploadDir, type}) {
  return {
    upload(req) {
      return co(function*() {
        let intFile;
        try {
          yield Promise.all([fsp.ensureDir(tmpDir), fsp.ensureDir(uploadDir)]);
          intFile = yield file.getInternalFile({ req, maxSize, type, filePath: tmpDir});
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
