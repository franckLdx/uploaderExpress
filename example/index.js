'use strict';

const express = require('express');
const uploaderExpress = require('../index.js'); // require('uploaderExpress');

const app = express();

const uploaderMiddleware = uploaderExpress.middleware({
  maxSize: '1gb',
  uploadDir: './upload',
  type: 'json',
  generateFileName: req => `${req.params.name}${Date.now()}${'.txt'}`,
  generateRelativePath: req => req.params.path,
});

app.post('/upload/:path/:name', uploaderMiddleware, (req, res, next) => {
  res.status(200).json({
    file: req.x_file.name,
    size: req.x_file.size,
  });
});

app.use((err, req, res, next) => {
  console.log(
    'Error while processing a request. Request: ',
    {
      originalUrl: req.originalUrl,
      headers: req.headers,
    },
    '\nError: ', err
  );
  if (err.status) {
    res.status(err.status);
    if (err.message) {
      res.end(err.message);
    } else {
      res.end();
    }
  } else {
    res.status(500).end('Something goes wrong!');
  }
});

app.listen(8080, () => {
  console.log('Example app listening on port 8080!');
});
