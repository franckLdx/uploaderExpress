'use strict';

const co = require('co');
const os = require('os');

const file = require('./file');

function streamToStream(readStream, writetream, intFile, resolve, reject) {
  readStream.on('data', data => {
    const actualData = data.toString();
    intFile.addSize(actualData.length);
    writetream.write(actualData);
  });

  readStream.on('end', () => {
    resolve();
  });

  readStream.on('error', (err) => {
    writetream.pause();
    reject(err);
  });

  writetream.on('error', (err) => {
    readStream.pause();
    reject(err);
  });
}

function saveData(req, intFile) {
  return new Promise((resolve, reject) => {
    const fileStream =  intFile.createWriteStream();

    const onSuccess = () => {
      fileStream.on('close', resolve);
      fileStream.on('error', reject);
      fileStream.end();
    };

    const onError = (err) => {
      fileStream.on('close', () => {reject(err);});
      fileStream.on('error', () => {reject(err);});
      fileStream.end();
    };

    streamToStream(req, fileStream, intFile, onSuccess, onError);
  });
}

function upload({req, intFile, uploadDir}) {
  return co(function*() {
    try {
      yield saveData(req, intFile);
      yield intFile.move(uploadDir);
    } catch (err) {
      intFile.delete(); // We try to delete file, but don't care if failure or success
      throw err;
    }
  });
}

module.exports = function({maxSize, tmpDir=os.tempdir(), uploadDir, type}) {
  return {
    upload(req) {
      return co(function *() {
        const intFile = file.getInternalFile({req, maxSize, type, tmpDir});
        return yield upload({req, intFile, uploadDir});
      });
    }
  };
}
