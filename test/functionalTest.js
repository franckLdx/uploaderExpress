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

  beforeEach(() => {
    return fsp.remove(rootDir);
  });

  function setErrorHandler(app) {
    app.use(function(err, req, res, next) {
      const status = err.status ? err.status: 500;
      res.status(status).send(err.message);
    });
  }

  function testValidRequest({middleware, content}) {
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
    return agent.post(URL).send(content)
      .expect(200);
  }

  function testUnvalidRequest({expectedStatus=400, middleware, content, contentLength}) {
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
    return agent.send(content).expect(expectedStatus);
  }

  it('Request with no content', () => {
    const middleware = uploaderExpress.middleware({tmpDir, uploadDir});
    return testUnvalidRequest({middleware});
  });

  it('Request with a content and no maxSize', () => {
    const middleware = uploaderExpress.middleware({tmpDir, uploadDir});
    return testValidRequest({middleware, content:'aaa'});
  });

  it('Request with a content lower than maxSize (maxSize is an int)', () => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:content.length+10, tmpDir, uploadDir});
    return testValidRequest({middleware, content});
  });

  it('Request with a content lower than maxSize (maxSize is a string)', () => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:'1024kb', tmpDir, uploadDir});
    return testValidRequest({middleware, content});
  });

  it('Request with a content equals to maxSize (maxSize is an integer)', () => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:content.length, tmpDir, uploadDir});
    return testValidRequest({middleware, content});
  });

  it('Request with a content equals to maxSize (maxSize is a string)', () => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:`${content.length}`, tmpDir, uploadDir});
    return testValidRequest({middleware, content});
  });

  it('Request with a content bigger than maxSize (maxSize is an integer)', () => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:content.length-2, tmpDir, uploadDir});
    return testUnvalidRequest({expectedStatus:413, middleware, content});
  });

  it('Request with a content bigger than maxSize (maxSize is a string)', () => {
    const content='aaa';
    const middleware = uploaderExpress.middleware({maxSize:`${content.length-2}`, tmpDir, uploadDir});
    return testUnvalidRequest({expectedStatus:413, middleware, content});
  });

  it('Request with a content lower than it\'s contentLength', function() {
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
    return agent.send(content)
      .then(() => Promise.reject('Should get an error'))
      .catch((err) =>  expect(err.message).to.be.deep.equal('socket hang up'));
  });

  it('Request with a content lower than it`s contentLength', () => {
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
    return agent.send(content)
      .then(() => Promise.reject('Should get an error'))
      .catch((err) => expect(err.message).to.be.deep.equal('socket hang up'));
  });
});
