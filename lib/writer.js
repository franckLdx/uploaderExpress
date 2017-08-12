'use strict';

const { Transform } = require('stream');
const { ClientCloseRequest } = require('./errors');
const fsp = require('fs-extra');

/** ObserverStream check this data does not exceded the expected size*/
const getObserverStream = module.exports.getObserverStream = function getObserverStream(observer) {
  return new Transform({
    transform(chunk, encoding, callback) {
      try {
        observer(chunk, encoding);
        callback(null, chunk);
      } catch (err) {
        callback(err, null);
      }
    },
  });
};

// COpy date from a red stream to a writre stream using an observer between them
const streamToStream = module.exports.streamToStream =
function streamToStream(readStream, writetream, observerStream) {
  return new Promise((resolve, reject) => {
    writetream.on('finish', () => {
      resolve();
    });

    const onError = (err) => {
      readStream.unpipe(observerStream);
      observerStream.unpipe(writetream);
      reject(err);
    };

    readStream.on('error', onError);
    readStream.on('abort', () => { onError(new ClientCloseRequest('The request has been aborted by the client')); });
    readStream.on('aborted', () => { onError(new ClientCloseRequest('Timeout: the request has been aborted by the server')); });
    writetream.on('error', onError);
    observerStream.on('error', onError);

    readStream.pipe(observerStream).pipe(writetream);
  });
};

/** The main upload function, use thre request as a readStream */
module.exports.reqToFile = async function reqToFile(req, intFile) {
  let fd;
  try {
    fd = await fsp.open(
      intFile.fullPath,
      fsp.constants.O_WRONLY | fsp.constants.O_CREAT | fsp.constants.O_EXCL,
      0o666
    );
    const fileStream = fsp.createWriteStream(null, { fd, autoClose: false });
    const observor = (data) => { intFile.incCurrentSize(data.length); };
    const observerStream = getObserverStream(observor);

    await streamToStream(req, fileStream, observerStream);

    await fsp.close(fd);
    return;
  } catch (err) {
    try { await fsp.close(fd); } catch (err2) { /* The first error matter, not this one */ }
    throw err;
  }
};
