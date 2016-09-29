# Work in progress, this is not ready yet

---

# uploaderExpress
Write huge amount of data into a file.

This aims to write a huge amount from an express request to a file. uploaderExpress uses streams and **never load the full amount of data into memory**.

---
# API
```javascript
const uploaderExpress = require('../index');
const uploaderMiddleware = uploaderExpress.middleware(options); // options are explained below

app.post('/', middleware, (req, res, next) => {
  /* if uploader is successfull, req.x_file contains information about the file that stores the uploaded data, it is detailed below.*/
});
/* If uploader failed, an express error is generated and can be handled as any express error.
An error contains a status (http error code) and a message*/
 */
app.use(function(err, req, res, next) {
        logger.error(`Error while processing a request. Request: `, {originalUrl:req.originalUrl, headers: req.headers}, '\nError: ', err);
        if (err.status) {
          res.status(err.status);
          if (err.message) {
            res.end(err.message);
          } else {
            res.end();
          }
        } else {
            res.status(500).end('Something brokes!');
        }
    });
```
___

#### Options
A middleware is created like this:
```javascript
const uploaderMiddleware = uploaderExpress.middleware({
  maxSize: 1000
});
```
