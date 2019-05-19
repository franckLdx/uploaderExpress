'use strict';

const { Readable, Writable } = require('stream');

const { expect } = require('chai');
const sinon = require('sinon');
const fsp = require('fs-extra');

const writer = require('../lib/writer');

describe('writer test', function () {
  let sandbox;

  function getStreams() {
    const data = ['a', 'b', 'c', 'd'];
    const readableStream = new Readable({
      read() {
        this.ind = this.ind || 0;
        if (this.ind < data.length) {
          this.push(data[this.ind]);
          this.ind += 1;
        } else {
          this.push(null);
        }
      },
    });
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        try {
          this.ind = this.ind || 0;
          expect(chunk.toString()).to.be.deep.equal(data[this.ind]);
          this.ind += 1;
          callback();
        } catch (err) {
          callback(err);
        }
      },
    });
    return { readableStream, writableStream };
  }

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function stubFsp(writeStream) {
    sandbox.stub(fsp, 'open').returns(Promise.resolve(1));
    sandbox.stub(fsp, 'createWriteStream').returns(writeStream);
  }

  it('No max size, Whole data should be writen', async function () {
    const { readableStream, writableStream } = getStreams();
    stubFsp(writableStream);
    const fileDesc = {
      fullPath: '',
      filePath: '',
      fileName: '',
      expectedSize: undefined,
    };
    await writer.reqToFile(readableStream, fileDesc);
    expect(writableStream.buf).to.be.deep.equal(readableStream.buf);
  });

  it('Data lengh < max size, Whole data should be writen', async function () {
    const { readableStream, writableStream } = getStreams();
    stubFsp(writableStream);
    const fileDesc = {
      fullPath: '',
      filePath: '',
      fileName: '',
      expectedSize: 1000,
    };
    await writer.reqToFile(readableStream, fileDesc);
    expect(writableStream.buf).to.be.deep.equal(readableStream.buf);
  });

  it('Data lengh > max size, data should be writen', async function () {
    const { readableStream, writableStream } = getStreams();
    stubFsp(writableStream);
    const fileDesc = {
      fullPath: '',
      filePath: '',
      fileName: '',
      expectedSize: 1,
    };
    try {
      await writer.reqToFile(readableStream, fileDesc);
    } catch (err) {
      expect(err).to.be.deep.equal({
        message: 'Data size is bigger than the maximum alowed size (1): upload aborted.',
        status: 413,
      });
    }
  });

  it('An error is thrown, should stop the copy', async function () {
    const { writableStream } = getStreams();
    stubFsp(writableStream);
    const readableStream = new Readable({
      read() {
        this.emit('error', 'boom');
      },
    });
    const fileDesc = {
      fullPath: '',
      filePath: '',
      fileName: '',
      expectedSize: undefined,
    };
    try {
      await writer.reqToFile(readableStream, fileDesc);
    } catch (err) {
      expect(err).to.be.deep.equal('boom');
    }
  });
});
