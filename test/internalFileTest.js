'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const expect = require('chai').expect;

const file = require('../lib/file');

describe('Internal file tests', () => {
    function getRequest(contentLength) {
      return {
        get() {
          return contentLength;
        }
      }
    }

  describe('Initialization tests', () => {
      describe('Basic initialisation test', () => {
        function testValidInit(params, done) {
          file.getInternalFile(params)
            .then((intFile) => {
              expect(intFile._filePath).to.be.deep.equal(params.filePath);
              if (params.type) {
                expect(intFile._fileName.endsWith(`.${params.type}`)).to.be.true;
              } else {
                expect(intFile._fileName).not.to.be.undefined;
              }
              expect(intFile.fullPath).to.be.deep.equal(path.resolve(params.filePath, intFile._fileName));
              expect(intFile._expectedSize).to.be.deep.equal(params.req.get('content-length'));
              expect(intFile._actualSize).to.be.deep.equal(0);
              done();
            })
            .catch(done);
        }

        it('All parameters are defined', (done) => {
          const params = { req:getRequest(10), maxSize:50, type:'json', filePath:'foo'};
          testValidInit(params,done);
        });

        it('file type is not set', (done) => {
          const params = { req:getRequest(10), maxSize:50, filePath:'foo'};
          testValidInit(params,done);
        });

        it('MaxSize is not set', (done) => {
          const params = { req:getRequest(10), type:'json', filePath:'foo'};
          testValidInit(params,done);
        });
      });
    })

  describe('Size management test', () => {
    function testValidSize({contentLength, maxSize, exptectedSize}, done) {
      const params = { req:getRequest(contentLength), maxSize, type:'json', filePath:'foo'};
      file.getInternalFile(params)
        .then((intFile) => {
          expect(intFile._expectedSize).to.be.deep.equal(exptectedSize);
          done();
        })
        .catch(done);
    }

    it('Both req content-length and MaxSize are defined, expected size should be content-length', (done) => {
        const contentLength = 10, maxSize = 50;
        testValidSize({contentLength, maxSize, exptectedSize:contentLength}, done);
    });

    it('Req content-length is not defined, MaxSize is defined, expected size should be MaxSize', (done) => {
      const contentLength = undefined, maxSize = 50;
      testValidSize({contentLength, maxSize, exptectedSize:maxSize}, done);
    });

    it('Req content-length is defined, MaxSize is not defined, expected size should be content-length', (done) => {
        const contentLength = 10, maxSize = undefined;
        testValidSize({contentLength, maxSize, exptectedSize:contentLength}, done);
    });

    it('Neither Req content-length nor MaxSize are defined, expected size should be SIZE_NOT_DEFINED', (done) => {
        const contentLength = undefined, maxSize = undefined;
        testValidSize({contentLength, maxSize, exptectedSize:undefined}, done);
    });

    it('Both req content-length and MaxSize are defined, content-length is bigger than MaxSize: an expection should be thrown', (done) => {
        const params = { req:getRequest(50), maxSize:10, type:'json', filePath:'foo'};
        file.getInternalFile(params)
          .then(() => {done('An error should have been thrown');})
          .catch(() => done());
    });

    it('Both req content-length and MaxSize are defined and equals, expected size should be this value', (done) => {
        const contentLength = 10, maxSize = 10;
        testValidSize({contentLength, maxSize, exptectedSize:contentLength}, done);
    });
  });

  describe('File system operations tests', () => {
    let intFile;

    beforeEach((done) => {
      file.getInternalFile({req:getRequest(10), maxSize:50, filePath:os.tmpdir(), type:'nodeTest'})
      .then((_intFile) => {
        intFile = _intFile;
        done();
      })
      .catch(done);
    });

    function createFile(file) {
      if (isFileExist(file)) {
        throw new Error('File ${file} already exist');
      }
      const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT |  fs.constants.O_EXCL);
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

    it('CreateStream test: a file should exist at the expected location', (done) => {
      const stream = intFile.createWriteStream();
      stream.end();
      stream.on('close', () => {
        if (isFileExist(intFile.fullPath)) {
          done();
        } else {
          done('File has not been created !')
        }
      });
      stream.on('error', done);
    });

    describe('MoveAsync tests', () => {
      beforeEach(() => {
        createFile(intFile.fullPath);
      });

      it('Valid move: intFile data shoud be up to date', (done) => {
        const destDir = './test';
        intFile.moveAsync(destDir)
          .then(() => {
            if (!isFileExist(intFile.fullPath)) {
              throw new Error('File has not been moved');
            }
            expect(intFile.fullPath).to.be.deep.equal(path.resolve(destDir,intFile._fileName));
            done();
          })
          .catch(done);
      });

      it('Move to an non existing directory: should failed, intFile data should be unchanged', (done) => {
        const fullPath = intFile.fullPath;
        intFile.moveAsync('Z:/test/foo')
          .then(() => {
            done('An error shoud have been thrown');
          })
          .catch(() => {
            expect(intFile.fullPath).to.be.deep.equal(fullPath);
            if (!isFileExist(intFile.fullPath)) {
              throw new Error('File has been moved !!!');
            }
            done();
          })
          .catch(done);
      });

      it('Move a non existing file, should failed', (done) => {
        const fullPath = intFile.fullPath;
        deleteFile(fullPath);
        intFile.moveAsync('./test')
          .then(() => {
            done('An error shoud have been thrown');
          })
          .catch(() => {
            expect(intFile.fullPath).to.be.deep.equal(fullPath);
            done();
          })
          .catch(done);
      });
    });

    describe('DeleteAsync tests', () => {
      beforeEach(() => {
        createFile(intFile.fullPath);
      });

      it('Valid deletion', (done) => {
        if (!isFileExist(intFile.fullPath)) {
          throw new Error('NONONFile still exist !!!');
        }
        intFile.deleteAsync()
          .then(() => {
              if (isFileExist(intFile.fullPath)) {
                throw new Error('File still exist !!!');
              }
              done();
            }
          ).catch(done);
      });

      it('Delete a non existing file, shoud failed', (done) => {
        const fullPath = intFile.fullPath;
        deleteFile(fullPath);
        intFile.deleteAsync()
          .then(() => {done('An error shoud be thrown');})
          .catch(() => {
            expect(intFile.fullPath).to.be.deep.equal(fullPath);
            done();
          })
          .catch(done);
      });

    });
  });

  describe('incSize (data size exceeds or not the milit) tests', () => {
    it('Expected size is set, adding as data as expected size should work', (done) => {
      const params = { req:getRequest(10), maxSize:50, type:'json', filePath:'foo'};
      file.getInternalFile(params)
        .then((intFile) => {
          intFile.incSize(3);
          intFile.incSize(7);
          done();
        })
        .catch(done);
    });
    it('Expected size is not set, adding data should work', (done) => {
      const params = { req:getRequest(undefined), maxSize:undefined, type:'json', filePath:'foo'};
      file.getInternalFile(params)
        .then((intFile) => {
          intFile.incSize(3);
          intFile.incSize(7);
          intFile.incSize(1000);
          done();
        })
        .catch(done);
    });
    it('Expected size is set, adding more data than expected size should failed', (done) => {
      const params = { req:getRequest(10), maxSize:50, type:'json', filePath:'foo'};
      file.getInternalFile(params)
        .then((intFile) => {
          intFile.incSize(3);
          intFile.incSize(7);
          try {
            intFile.incSize(10);
            done('Exception has not been thrown');
          } catch (err) {
            done();
          }
        })
        .catch(done);
    });
  });
});
