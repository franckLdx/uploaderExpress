'use strict';

const co = require('co');
const {Readable, Writable} = require('stream');

const expect = require('chai').expect;
const sinon = require('sinon');
const fsp = require('fs-promise');

const writer = require('../lib/writer');

function getStreams(observer) {
  const data = ['a','b','c','d'];
  const observerStream = writer.getObserverStream(observer);
  const readableStream = new Readable({
    read() {
      this.ind = this.ind || 0;
      if (this.ind < data.length) {
        this.push(data[this.ind]);
        this.ind++;
      } else {
        this.push(null);
      }
    }
  });
  const writableStream = new Writable({
    write(chunk, encoding, callback) {
      try {
        this.ind = this.ind || 0;
        expect(chunk.toString()).to.be.deep.equal(data[this.ind]);
        this.ind++;
        callback();
      } catch (err) {
        callback(err);
      }
    }
  });
  return { readableStream, writableStream, observerStream}
}

describe('MyTransformer  test', () => {

  it('Observer issues no error', (done) => {
    const observer = () => {};
    const {readableStream, writableStream, observerStream} = getStreams(observer);
    writableStream.on('finish', done);
    observerStream.on('error', done);
    writableStream.on('error', done);
    readableStream.pipe(observerStream).pipe(writableStream);
  });

  it('Observer issues an error', (done) => {
    const observer = () => { throw new Error('No I don\'t want'); };
    const {readableStream, writableStream, observerStream} = getStreams(observer);
    writableStream.on('finish', () => done('Should not complete without error'));
    observerStream.on('error', () => done());
    writableStream.on('error', done);
    readableStream.pipe(observerStream).pipe(writableStream);
  });
});

describe('streamToStream test', () => {
  it('Whole data are copied', () => {
    const observer = () => {};
    const {readableStream, writableStream, observerStream} = getStreams(observer);
    return writer.streamToStream(readableStream, writableStream, observerStream);
  });

  it('obverver generates an error, should stop the copy', () => {
    const observer = () => { throw new Error('I say noooo, noooo, no')};
    const {readableStream, writableStream, observerStream} = getStreams(observer);
    return writer.streamToStream(readableStream, writableStream, observerStream)
      .then(() => Promise.reject('Promise should be on error'))
      .catch(() => Promise.resolve())
  });

  it('readStream error: should stop the copy', () => {
    const observer = () => {};
    const {writableStream, observerStream} = getStreams(observer);
    const readableStream = new Readable({
      read() {
        this.emit('error', 'aborted');
      }
    });
    return writer.streamToStream(readableStream, writableStream, observerStream)
      .then(() => Promise.reject('Promise should be on error'))
      .catch(() => Promise.resolve())
  });

  it('writeStream error: should stop the copy', () => {
    const observer = () => {};
    const {readableStream, observerStream} = getStreams(observer);
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        callback('aborted');
      }
    });
    return writer.streamToStream(readableStream, writableStream, observerStream)
      .then(() => Promise.reject('Promise should be on error'))
      .catch(() => Promise.resolve())
  });
});

describe('reqToFile test', () => {
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

    function getStreams() {
      const writeStream = new class extends Writable {
        constructor() {
          super();
          this.buf= [];
        }
        _write(chunck, encoding, cb) {
          this.buf.push(chunck.toString());
          cb();
        }
      };
      const readStream = new class extends Readable {
        constructor() {
          super();
          this.buf= ['a','b','c','d'];
          this.ind=0;
        }
        _read() {
          if (this.ind>this.buf.length) {
            this.push(null);
          } else {
            this.push(this.buf[this.ind]);
            this.ind++;
          }
        }
      };
      return { readStream, writeStream };
    }

    it('No error, whole data should be copied', () => {
      return co(function *() {
        const {readStream, writeStream} = getStreams();
        stubFsp(writeStream);
        const intFile = {
          fullPath() { return ''; },
          incCurrentSize() {}
        };
        yield writer.reqToFile(readStream, intFile);
        expect(writeStream.buf).to.be.deep.equal(readStream.buf);
      });
    });

    it('An error is thrown, should stop the copy', () => {
      return co(function *() {
        try {
          const {readStream, writeStream} = getStreams();
          stubFsp(writeStream);
          const intFile = {
            incCurrentSize(size) {
              this.count = size + this.count || size;
              if (this.count===3) {
                throw new Error('No no');
              }
            }
          };
          try {
            yield writer.reqToFile(readStream, intFile);
          } catch (err) {
            if (writeStream.buf.length!==2) {
              throw `Writestream received too much data: ${writeStream.buf.length}`;
            } else {
              throw err;
            }
          }
          throw 'An error should be thrown';
        } catch (err) {
          expect(err.message).to.be.deep.equal('No no');
        }
      });
    });

    it('An error is thrown, should stop the copy', () => {
      return co(function *() {
        try {
          sandbox.stub(fsp, 'open').returns(Promise.resolve(1));
          sandbox.stub(fsp, 'createWriteStream').throws(new Error('unexpected failure'));
          yield writer.reqToFile(undefined, {});
          throw 'An error should be thrown';
        } catch (err) {
          expect(err.message).to.be.deep.equal('unexpected failure');
        }
      })
    });
  });
