'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const expect = require('chai').expect;

const file = require('../lib/file');

function getRequest(contentLength) {
  return {
    get() {
      return contentLength;
    }
  }
}

describe('Internal file tests', () => {

  describe('Initialization tests', () => {
    describe('Basic initialisation test', () => {
      function testValidInit(params) {
        return file.getInternalFile(params)
          .then((intFile) => {
            expect(intFile._filePath).to.be.deep.equal(params.filePath);
            if (params.type) {
              expect(intFile._fileName.endsWith(`.${params.type}`)).to.be.true;
            } else {
              expect(intFile._fileName).not.to.be.undefined;
            }
            expect(intFile.fullPath).to.be.deep.equal(path.resolve(params.filePath, intFile._fileName));
            expect(intFile._expectedSize).to.be.deep.equal(params.req.get('content-length'));
            expect(intFile._currentSize).to.be.deep.equal(0);
          })
      }

      it('All parameters are defined', () => {
        const params = {
          req: getRequest(10),
          maxSize: 50,
          type: 'json',
          filePath: 'foo'
        };
        return testValidInit(params);
      });

      it('file type is not set', () => {
        const params = {
          req: getRequest(10),
          maxSize: 50,
          filePath: 'foo'
        };
        return testValidInit(params);
      });

      it('MaxSize is not set', () => {
        const params = {
          req: getRequest(10),
          type: 'json',
          filePath: 'foo'
        };
        return testValidInit(params);
      });
    });
  });

  describe('Size management test', () => {
    function getParams({contentLength, maxSize}) {
      return {
        req: getRequest(contentLength),
        maxSize,
        type: 'json',
        filePath: 'foo'
      };
    }

    function testValidSize({contentLength, maxSize, exptectedSize}) {
      const params = getParams({contentLength, maxSize});
      return file.getInternalFile(params)
        .then((intFile) => {
          expect(intFile._expectedSize).to.be.deep.equal(exptectedSize);
        });
    }

    function testUnvalidSize({contentLength, maxSize}) {
      const params = getParams({contentLength, maxSize})
      return file.getInternalFile(params)
        .then(() => Promise.reject('Should got an error'))
        .catch(() => Promise.resolve())
    }

    it('Both req content-length and MaxSize are defined, expected size should be content-length', () => {
      const
        contentLength = 10,
        maxSize = 50;
      return testValidSize({contentLength, maxSize, exptectedSize: contentLength});
    });

    it('Req content-length is not defined, MaxSize is defined, expected size should be MaxSize', () => {
      const
        contentLength = undefined,
        maxSize = 50;
      return testValidSize({contentLength, maxSize, exptectedSize: maxSize});
    });

    it('Req content-length is defined, MaxSize is not defined, expected size should be content-length', () => {
      const
        contentLength = 10,
        maxSize = undefined;
      return testValidSize({contentLength, maxSize, exptectedSize: contentLength});
    });

    it('Neither Req content-length nor MaxSize are defined, expected size should be undefined', () => {
      const
        contentLength = undefined,
        maxSize = undefined;
      return testValidSize({contentLength, maxSize, exptectedSize: undefined});
    });

    it('Both req content-length and MaxSize are defined, content-length is bigger than MaxSize: an expection should be thrown', () => {
      const params = { req: getRequest(50), maxSize: 10, type: 'json', filePath: 'foo'};
      file.getInternalFile(params)
        .then(() => Promise.reject('An error should have been thrown'));
    });

    it('Both req content-length and MaxSize are defined and equals, expected size should be this value', () => {
      const
        contentLength = 10,
        maxSize = 10;
      return testValidSize({contentLength, maxSize, exptectedSize: contentLength});
    });

    it('Req has a content-length equals to 0, exception should be thrown', () => {
      const
        contentLength = 0,
        maxSize = 10;
      return testUnvalidSize({contentLength, maxSize});
    });
  });

  describe('File system operations tests', () => {
    let intFile;

    beforeEach(() => {
      return file.getInternalFile({req: getRequest(10), maxSize: 50, filePath: os.tmpdir(), type: 'nodeTest'})
        .then((_intFile) => {
          intFile = _intFile;
        });
    });

    function createFile(file) {
      if (isFileExist(file)) {
        throw new Error('File ${file} already exist');
      }
      const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL);
      fs.closeSync(fd);
    }

    function deleteFile(file) {
      if (isFileExist(file)) {
        fs.unlinkSync(file);
      }
    }

    function isFileExist(file) {
      try {
        fs.statSync(file);
        return true;
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        return false;
      }
    }

    afterEach(() => {
      deleteFile(intFile.fullPath);
    });

    describe('MoveAsync tests', () => {
      beforeEach(() => {
        createFile(intFile.fullPath);
      });

      it('Valid move: intFile data shoud be up to date', () => {
        const destDir = './test';
        return intFile.moveAsync(destDir)
          .then(() => {
            if (!isFileExist(intFile.fullPath)) {
              throw new Error('File has not been moved');
            }
            expect(intFile.fullPath).to.be.deep.equal(path.resolve(destDir, intFile._fileName));
          })
      });

      it('Move to an non existing directory: should failed, intFile data should be unchanged', () => {
        const fullPath = intFile.fullPath;
        return intFile.moveAsync('Z:/test/foo')
          .then(() => Promise.reject('An error shoud have been thrown'))
          .catch(() => {
            expect(intFile.fullPath).to.be.deep.equal(fullPath);
            if (!isFileExist(intFile.fullPath)) {
              throw new Error('File has been moved !!!');
            }
          });
      });

      it('Move a non existing file, should failed', () => {
        const fullPath = intFile.fullPath;
        deleteFile(fullPath);
        return intFile.moveAsync('./test')
          .then(() => Promise.reject('An error shoud have been thrown'))
          .catch(() => expect(intFile.fullPath).to.be.deep.equal(fullPath));
      });
    });

    describe('DeleteAsync tests', () => {
      beforeEach(() => {
        createFile(intFile.fullPath);
      });

      it('Valid deletion', () => {
        if (!isFileExist(intFile.fullPath)) {
          throw new Error('NONONFile still exist !!!');
        }
        return intFile.deleteAsync()
          .then(() => {
            if (isFileExist(intFile.fullPath)) {
              throw new Error('File still exist !!!');
            }
          });
      });

      it('Delete a non existing file, shoud failed', () => {
        const fullPath = intFile.fullPath;
        deleteFile(fullPath);
        return intFile.deleteAsync()
          .then(() => Promise.reject('An error shoud be thrown'))
          .catch(() => expect(intFile.fullPath).to.be.deep.equal(fullPath));
      });

    });
  });

  describe('incCurrentSize (data size exceeds or not the milit) tests', () => {
    it('Expected size is set, adding as data as expected size should work', () => {
      const params = {
        req: getRequest(10),
        maxSize: 50,
        type: 'json',
        filePath: 'foo'
      };
      return file.getInternalFile(params)
        .then((intFile) => {
          intFile.incCurrentSize(3);
          intFile.incCurrentSize(7);
        });
    });
    it('Expected size is not set, adding data should work', () => {
      const params = {
        req: getRequest(undefined),
        maxSize: undefined,
        type: 'json',
        filePath: 'foo'
      };
      return file.getInternalFile(params)
        .then((intFile) => {
          intFile.incCurrentSize(3);
          intFile.incCurrentSize(7);
          intFile.incCurrentSize(1000);
        });
    });
    it('Expected size is set, adding more data than expected size should failed', () => {
      const params = {
        req: getRequest(10),
        maxSize: 50,
        type: 'json',
        filePath: 'foo'
      };
      return file.getInternalFile(params)
        .then((intFile) => {
          intFile.incCurrentSize(3);
          intFile.incCurrentSize(7);
          try {
            intFile.incCurrentSize(10);
            return Promise.reject('Exception has not been thrown');
          } catch (err) {
            return;
          }
        });
    });
  });
});
