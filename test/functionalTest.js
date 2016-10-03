'use strict';

const expect = require('chai').expect;
const express = require('express');
const fsp = require('fs-promise');
const request = require('supertest');
const path = require('path');

const uploaderExpress = require('../index');

const URL = '/';
const rootDir = './test/upload';
const tmpDir = path.join(rootDir, 'tmp');
const uploadDir = path.join(rootDir, 'upload');

describe('Functional test', () => {

  beforeEach((done) => {
    fsp.remove(rootDir).then(done,done);
  });

  function setErrorHandler(app) {
    app.use(function(err, req, res, next) {
      const status = err.status ? err.status: 500;
      res.status(status).send(err.message);
    });
  }

  function testValidRequest({middleware, content, done}) {
    const app = express();
    app.post(URL, middleware, (req, res) => {
      try {
        expect(req.x_file.size).to.be.deep.equal(content.length);
        res.end();
      } catch (err) {
        res.status(500).end(err.message);
      }
    });
    setErrorHandler(app);
    const agent = request.agent(app);
    agent.post(URL).send(content)
      .expect(200)
      .then(() => { done();})
      .catch(done);
  }

  function testUnvalidRequest({expectedStatus=400, middleware, content, contentLength, done}) {
    const app = express();
    app.post(URL, middleware, (req, res) => {
        res.end();
    });
    setErrorHandler(app);
    let agent = request.agent(app);
    agent = agent.post(URL);
    if (contentLength!==undefined) {
      agent.set('Content-Length', contentLength)
    }
    agent.send(content)//.expect(expectedStatus)
      .then(() => { done();} )
      .catch(done);
  }

  it('Request with no content', (done) => {
    const middleware = uploaderExpress.middleware({tmpDir, uploadDir});
    testUnvalidRequest({middleware, done});
  });

  it('Request with a content and no maxSize', (done) => {
    const middleware = uploaderExpress.middleware({tmpDir, uploadDir});
    testValidRequest({middleware, content:'aaa', done});
  });

  it('Request with a content lower than maxSize', (done) => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:content.length+10, tmpDir, uploadDir});
    testValidRequest({middleware, content, done});
  });

  it('Request with a content equals to maxSize', (done) => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:content.length, tmpDir, uploadDir});
    testValidRequest({middleware, content, done});
  });

  it('Request with a content bigger than maxSize', (done) => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:content.length-2, tmpDir, uploadDir});
    testUnvalidRequest({expectedStatus:413, middleware, content, done});
  });

  it('Request with a content lower than it\'s contentLength', function(done) {
    this.timeout(1000*60*3);
    const content = 'aaa';
    const middleware = uploaderExpress.middleware({maxSize:content.length*10, tmpDir, uploadDir});
    const app = express();
    app.post(URL, middleware, (req, res) => {
        res.end();
    });
    setErrorHandler(app);
    let agent = request.agent(app);
    agent = agent.post(URL);
    agent.set('Content-Length', content.length+5);
    agent.send(content)
      .then(() => { done('Should get an error');})
      .catch((err) => {
        expect(err.message).to.be.deep.equal('socket hang up');
        done();
      }).catch(done);
  });

  it('Request with a content lower than it`s contentLength', (done) => {
    const content = 'aaa';
    const middleware = uploaderExpress.middleware({tmpDir, uploadDir});
    const app = express();
    app.post(URL, middleware, (req, res) => {
        res.end();
    });
    setErrorHandler(app);
    let agent = request.agent(app);
    agent = agent.post(URL);
    agent.set('Content-Length', content.length-1);
    agent.send(content)
      .then(() => { done('Should get an error');})
      .catch((err) => {
        expect(err.message).to.be.deep.equal('socket hang up');
        done();
      }).catch(done);
  });
});
