'use strict';

const expect = require('chai').expect;
const request = require('supertest');
const express = require('express');

const uploaderExpress = require('../index');

describe('Size tests', () => {
  let app;

  beforeEach(() => {
    app = express();

    app.use((err, req, res, next) => {
      next(err);
    })

  });

  function getRequest(content) {
    const req = request(app).post('/');
    if (content) {
      req.send(content);
    }
    return req;
  }

  function testValidSize({middleware, content, expectedSize, done}) {
    app.post('/', middleware, (req, res) => {
        expect(req.x_file.size).to.equal(expectedSize);
        res.end();
    });
    getRequest(content)
      .expect(200)
      .end(done);
  }

  function testUnvalidSize({middleware, content, done}) {
    app.post('/', middleware, (req, res) => {
        res.end();
    });
    getRequest(content)
      .expect(400)
      .end(done);
  }

  describe('Max size not defined, any size should be accepted', () => {
    let middleware;

    before(() => {
      middleware = uploaderExpress.middleware();
    });

    it('Request with content-length 0', (done) => {
      testValidSize({middleware, expectedSize:0, done});
    });
    it('Request with some content', (done) => {
      const content = {
        msg: 'Hello world',
        name: 'John doe'
      };
      testValidSize({middleware, content, expectedSize:39, done});
    });

    it('Request with no content-length', (done) => {
      app.get('/', middleware, (req, res) => {
          expect(req.x_file.size).to.equal(0);
          res.end();
      });
      request(app).get('/').expect(200).end(done);
    });

  });

  describe('Max size defined, any size should be accepted', () => {
    let middleware;

    before(() => {
      middleware = uploaderExpress.middleware({maxSize:50});
    });

    it('Request with empty content', (done) => {
      testValidSize({middleware, expectedSize:0, done});
    });
    it('Request with some content', (done) => {
      const content = {
        msg: 'Hello world',
        name: 'John doe'
      };
      testValidSize({middleware, content, expectedSize:39, done});
    });

    it('Request with too big content', (done) => {
      const content = {
        msg: 'Hello world',
        name: 'John doe',
        oversize: '***********************************************************************'
      };
      testUnvalidSize({middleware, content, done});
    });
  });

});
