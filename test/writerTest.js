'use strict';

const {Readable, Writable} = require('stream');

const expect = require('chai').expect;

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
  it('Whole data are copied', (done) => {
    const observer = () => {};
    const {readableStream, writableStream, observerStream} = getStreams(observer);
    writer.streamToStream(readableStream, writableStream, observerStream).then(done, done);
  });

  it('obverver generates an error, should stop the copy', (done) => {
    const observer = () => { throw new Error('I say noooo, noooo, no')};
    const {readableStream, writableStream, observerStream} = getStreams(observer);
    writer.streamToStream(readableStream, writableStream, observerStream).then(
      () => done('Promise should be on error'),
      () => done()
    );
  });

  it('readStream error: should stop the copy', (done) => {
    const observer = () => {};
    const {writableStream, observerStream} = getStreams(observer);
    const readableStream = new Readable({
      read() {
        this.emit('error', 'aborted');
      }
    });
    writer.streamToStream(readableStream, writableStream, observerStream).then(
      () => done('Promise should be on error'),
      () => done()
    );
  });

  it('writeStream error: should stop the copy', (done) => {
    const observer = () => {};
    const {readableStream, observerStream} = getStreams(observer);
    const writableStream = new Writable({
      write(chunk, encoding, callback) {
        callback('aborted');
      }
    });
    writer.streamToStream(readableStream, writableStream, observerStream).then(
      () => done('Promise should be on error'),
      () => done()
    );
  });

});
