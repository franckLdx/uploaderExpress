'use strict';

const co = require('co');
const os = require('os');

const file = require('./file');
const { reqToFile } = require('./writer');

module.exports = function({maxSize, tmpDir=os.tmpdir(), uploadDir, type}) {
  return {
    upload(req) {
      return co(function *() {
        let intFile;
        try {
           intFile = yield file.getInternalFile({req, maxSize, type, filePath:tmpDir});
           yield reqToFile(req, intFile);
           yield intFile.moveAsync(uploadDir);
        } catch (err) {
          if (intFile) {
            intFile.deleteAsync(); // We try to delete file, but don't care if failure or success
          }
          throw err;
        }
      });
    }
  };
}
