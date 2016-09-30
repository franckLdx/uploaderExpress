'use strict';

const {Transform} = require('stream');


const getObserverStream = module.exports.getObserverStream = function (observer) {
  return new Transform({
    transform(chunk, encoding, callback) {
      try {
        observer(chunk, encoding);
        callback(null, chunk);
      } catch (err) {
        callback(err, null);
      }
    }
  });
};

const streamToStream = module.exports.streamToStream = function (readStream, writetream, observerStream) {
  return new Promise((resolve, reject) => {

    writetream.on('finish', () => {
      resolve();
    });

    const onError = (err) => {
      readStream.unpipe(observerStream)
      observerStream.unpipe(writetream);
      reject(err);
    }

    readStream.on('error', onError);
    writetream.on('error', onError);
    observerStream.on('error', onError);

    readStream.pipe(observerStream).pipe(writetream);
  });
};

module.exports.reqToFile = function (req, intFile) {
  try {
    const fileStream =  intFile.createWriteStream();
    const observor = (data) => { intFile.incCurrentSize(data.length); };
    const observerStream = getObserverStream(observor);

    return streamToStream(req, fileStream, observerStream);
  } catch (err) {
    return Promise.reject(err);
  }
};
