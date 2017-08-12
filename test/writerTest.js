'use strict';

const { Readable, Writable } = require('stream');

const expect = require('chai').expect;
const sinon = require('sinon');
const fsp = require('fs-extra');

const writer = require('../lib/writer');

function getStreams(observer) {
  const data = ['a', 'b', 'c', 'd'];
  const observerStream = writer.getObserverStream(observer);
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
  return { readableStream, writableStream, observerStream };
}

describe('MyTransformer  test', function () {

  it('Observer issues no error', (done) => {
    const observer = () => {};
    const { readableStream, writableStream, observerStream } = getStreams(observer);
    writableStream.on('finish', done);
    observerStream.on('error', done);
    writableStream.on('error', done);
    readableStream.pipe(observerStream).pipe(writableStream);
  });

  it('Observer issues an error', (done) => {
    const observer = () => { throw new Error('No I don\'t want'); };
    const { readableStream, writableStream, observerStream } = getStreams(observer);
    writableStream.on('finish', () => done('Should not complete without error'));
    observerStream.on('error', () => done());
    writableStream.on('error', done);
    readableStream.pipe(observerStream).pipe(writableStream);
  });
});

describe('streamToStream test', function () {
  it('Whole data are copied', function () {
    const observer = function () {};
    const { readableStream, writableStream, observerStream } = getStreams(observer);
    return writer.streamToStream(readableStream, writableStream, observerStream);
  });

  it('obverver generates an error, should stop the copy', function () {
    const observer = () => { throw new Error('I say noooo, noooo, no'); };
    const { readableStream, writableStream, observerStream } = getStreams(observer);
    return writer.streamToStream(readableStream, writableStream, observerStream)
      .then(() => Promise.reject('Promise should be on error'))
      .catch(() => Promise.resolve());
  });

  it('readStream error: should stop the copy', function () {
    const observer = () => {};
    const { writableStream, observerStream } = getStreams(observer);
    const readableStream = new Readable({
      read() {
        this.emit('error', 'aborted');
      },
    });
    return writer.streamToStream(readableStream, writableStream, observerStream)
      .then(() => Promise.reject('Promise should be on error'))
      .catch(() => Promise.resolve());
  });

  it('writeStream error: should stop the copy', function () {
    const observer = () => {};
    const { readableStream, observerStream } = getStreams(observer);
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        callback('aborted');
      },
    });
    return writer.streamToStream(readableStream, writableStream, observerStream)
      .then(() => Promise.reject('Promise should be on error'))
      .catch(() => Promise.resolve());
  });
});

describe('reqToFile test', function () {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  function stubFsp(writeStream) {
    sandbox.stub(fsp, 'open').returns(Promise.resolve(1));
    sandbox.stub(fsp, 'createWriteStream').returns(writeStream);
  }

  it('No error, whole data should be copied', async function () {
    const { readableStream, writableStream } = getStreams();
    stubFsp(writableStream);
    const intFile = {
      fullPath() { return ''; },
      incCurrentSize() {},
    };
    await writer.reqToFile(readableStream, intFile);
    expect(writableStream.buf).to.be.deep.equal(readableStream.buf);
  });

  it('An error is thrown, should stop the copy', async function () {
    const { readableStream, writableStream } = getStreams();
    stubFsp(writableStream);
    const intFile = {
      incCurrentSize(size) {
        this.count = size + this.count || size;
        if (this.count === 3) {
          throw new Error('No no');
        }
      },
    };
    try {
      await writer.reqToFile(readableStream, intFile);
    } catch (err) {
      expect(err.message).to.be.deep.equal('No no');
    }
  });

  it('An error is thrown, should stop the copy', async function () {
    try {
      sandbox.stub(fsp, 'open').returns(Promise.resolve(1));
      sandbox.stub(fsp, 'createWriteStream').throws(new Error('unexpected failure'));
      await writer.reqToFile(undefined, {});
      throw new Error('An error should be thrown');
    } catch (err) {
      expect(err.message).to.be.deep.equal('unexpected failure');
    }
  });
});
