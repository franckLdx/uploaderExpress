'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { expect } = require('chai');

const file = require('../lib/fileDesc');


describe('File desc tests', function () {

  function getRequest(contentLength) {
    return {
      get() {
        return contentLength;
      },
    };
  }

  describe('Initialization tests', function () {

    describe('Basic initialisation test', function () {

      async function testValidInit(params) {
        const fileDesc = await file.getFileDesc(params);
        expect(fileDesc.filePath).to.be.deep.equal(params.filePath);
        if (params.type) {
          expect(fileDesc.fileName.endsWith(`.${params.type}`)).to.be.true;
        } else {
          expect(fileDesc.fileName).not.to.be.undefined;
        }
        const expectedPath = path.resolve(params.filePath, fileDesc.fileName);
        expect(fileDesc.fullPath).to.be.deep.equal(expectedPath);
        expect(fileDesc.expectedSize).to.be.deep.equal(params.req.get('content-length'));
        return fileDesc;
      }

      it('All parameters are defined', function () {
        const params = {
          req: getRequest(10),
          maxSize: 50,
          type: 'json',
          filePath: 'foo',
        };
        return testValidInit(params);
      });

      it('file type is not set', function () {
        const params = {
          req: getRequest(10),
          maxSize: 50,
          filePath: 'foo',
        };
        return testValidInit(params);
      });

      it('MaxSize is not set', function () {
        const params = {
          req: getRequest(10),
          type: 'json',
          filePath: 'foo',
        };
        return testValidInit(params);
      });

      it('Name is generated', async function () {
        const params = {
          req: getRequest(10),
          filePath: 'foo',
          generateFileName: () => 'howdy!',
        };
        const fileDesc = await testValidInit(params);
        expect(fileDesc.fileName).to.be.equal('howdy!');
      });
    });
  });

  describe('Size management test', function () {
    function getParams({ contentLength, maxSize }) {
      return {
        req: getRequest(contentLength),
        maxSize,
        type: 'json',
        filePath: 'foo',
      };
    }

    async function testValidSize({ contentLength, maxSize, exptectedSize }) {
      const params = getParams({ contentLength, maxSize });
      const fileDesc = await file.getFileDesc(params);
      expect(fileDesc.expectedSize).to.be.deep.equal(exptectedSize);
    }

    function testUnvalidSize({ contentLength, maxSize }) {
      const params = getParams({ contentLength, maxSize });
      return file.getFileDesc(params)
        .then(() => Promise.reject('Should got an error'))
        .catch(() => Promise.resolve());
    }

    it('Both req content-length and MaxSize are defined, expected size should be content-length', async () => {
      const contentLength = 10;
      const maxSize = 50;
      return testValidSize({ contentLength, maxSize, exptectedSize: contentLength });
    });

    it('Req content-length is not defined, MaxSize is defined, expected size should be MaxSize', async () => {
      const contentLength = undefined;
      const maxSize = 50;
      return testValidSize({ contentLength, maxSize, exptectedSize: maxSize });
    });

    it('Req content-length is defined, MaxSize is not defined, expected size should be content-length', async () => {
      const contentLength = 10;
      const maxSize = undefined;
      return testValidSize({ contentLength, maxSize, exptectedSize: contentLength });
    });

    it('Neither Req content-length nor MaxSize are defined, expected size should be undefined', async () => {
      const contentLength = undefined;
      const maxSize = undefined;
      return testValidSize({ contentLength, maxSize, exptectedSize: undefined });
    });

    it('Both req content-length and MaxSize are defined, content-length is bigger than MaxSize: an expection should be thrown', async () => {
      const params = {
        req: getRequest(50),
        maxSize: 10,
        type: 'json',
        filePath: 'foo',
      };
      return file.getFileDesc(params)
        .then(() => Promise.reject('An error should have been thrown'))
        .catch(() => Promise.resolve());
    });

    it('Both req content-length and MaxSize are defined and equals, expected size should be this value', async () => {
      const contentLength = 10;
      const maxSize = 10;
      return testValidSize({ contentLength, maxSize, exptectedSize: contentLength });
    });

    it('Req has a content-length equals to 0, exception should be thrown', async () => {
      const contentLength = 0;
      const maxSize = 10;
      return testUnvalidSize({ contentLength, maxSize });
    });
  });

  describe('Move tests', function () {
    let fileDesc;

    beforeEach(async () => {
      fileDesc = await file.getFileDesc({
        req: getRequest(10),
        maxSize: 50,
        filePath: os.tmpdir(),
        type: 'nodeTest',
      });
    });

    function isFileExist(aFile) {
      try {
        fs.statSync(aFile);
        return true;
      } catch (err) {
        if (err.code !== 'ENOENT') {
          throw err;
        }
        return false;
      }
    }

    function createFile(aFile) {
      if (isFileExist(aFile)) {
        throw new Error(`File ${aFile} already exist`);
      }
      const fd = fs.openSync(
        aFile,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
      );
      fs.closeSync(fd);
    }

    function deleteFile(aFile) {
      if (isFileExist(aFile)) {
        fs.unlinkSync(aFile);
      }
    }

    afterEach(function () {
      deleteFile(fileDesc.fullPath);
    });

    beforeEach(function () {
      createFile(fileDesc.fullPath);
    });

    it('Valid move: fileDesc data shoud be up to date', async () => {
      const destDir = './test';
      const newFileDesc = await file.move(destDir, fileDesc);
      if (!isFileExist(newFileDesc.fullPath)) {
        throw new Error('File has not been moved');
      }
      expect(newFileDesc.filePath).to.be.deep.equal(destDir);
      expect(newFileDesc.fullPath).to.be.deep.equal(path.resolve(destDir, newFileDesc.fileName));
    });

    it('Move to an non existing directory: should failed, fileDesc data should be unchanged', function () {
      const { fullPath } = fileDesc;
      return file.move('Z:/test/foo', fileDesc)
        .then(() => Promise.reject('An error shoud have been thrown'))
        .catch(() => {
          expect(fileDesc.fullPath).to.be.deep.equal(fullPath);
          if (!isFileExist(fileDesc.fullPath)) {
            throw new Error('File has been moved !!!');
          }
        });
    });

    it('Move a non existing file, should failed', function () {
      const { fullPath } = fileDesc;
      deleteFile(fullPath);
      return file.move('./test', fileDesc)
        .then(() => Promise.reject('An error shoud have been thrown'))
        .catch(() => expect(fileDesc.fullPath).to.be.deep.equal(fullPath));
    });
  });

});
