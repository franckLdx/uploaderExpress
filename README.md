# UploaderExpress

Write huge amount of data into a file.

This aims to write a huge amount from an express request to a file. uploaderExpress uses streams and **never load the full amount of data into memory**.

**4.x requires Node v12 or later. For older Node release**
**2.x and 3.x requires Node v8 or later. For older Node release, you can use 1.x versions**

#### Synopsys

1. Setup the middleware (most important: set a maxSize)
2. When a request arrives, uploaderExpress check the content-length, if maxSize is exceeded, the request is rejected
3. Creation of a temporary file
4. Data are stored in this file. When data are comming, the uploaded size is contantly checked. if maxSize is exceeded, the request is rejected (even if in case of forged request, one cannot
   upload more than what is allowed by maxSize).
5. Once all data are uploaded, the file is move to the upload directory (the upload directory is also an option, see below). An object (x-file) is added to the request so that you can process it.

In case of error the temporary file is deleted and nothing is copied in the upload dir.

#### What's new

- **4.1.0** Update Readme + update deps + Node 17 is supported
- **4.0.2** Update Readme + update deps
- **4.0.1** Update Readme + update deps, Node 16 is now supported
- **4.0.0** Update Readme + update deps, Node 10 is not supported anymore
- **3.1.0** Update Readme + update dep + 2 new functions from from Andrew Eisenberg: generateFileName and generateRelativePath
- **3.0.3** Update Readme + fix from Andrew Eisenberg: req.x_file.name was always undefined
- **3.0.2** Update Readme
- **3.0.1** Update Readme
- **3.0.1** Update Readme
- **3.0.0** update dependencies + some code refactoring + little intrface change: the upload method is not exported anymore
- **2.0.1** update dependencies + some code refactoring.
- **2.0.0** co library is not use anymore. All asynchronous operation uses async:await.
- **1.1.2** Add package-lock.json and update dependencies
- **1.1.1** some code refactoring
- **1.1.0** maxSize can still be defined using an integer, but now it can also defined using a string like '1gb' (thanks to [bytes](https://www.npmjs.com/package/bytes)).
- **1.0.1** comes with some new dependencies. It also includes some tests refactoring.

#### Example

```javascript
const uploaderExpress = require("uploaderExpress");
const uploaderMiddleware = uploaderExpress.middleware(options); // options are explained below

app.post("/", valdRequest, uploaderMiddleware, (req, res, next) => {
  /* if uploader is successfull, req.x_file contains information about the file that stores the uploaded data, it is detailed below.*/
});

/* If uploader failed, an express error is generated and can be handled as any express error.
An error contains a status (http error code) and a message*/
app.use(function (err, req, res, next) {
  logger.error(
    `Error while processing a request. Request: `,
    { originalUrl: req.originalUrl, headers: req.headers },
    "\nError: ",
    err
  );
  if (err.status) {
    res.status(err.status);
    if (err.message) {
      res.end(err.message);
    } else {
      res.end();
    }
  } else {
    res.status(500).end("Something goes wrong!");
  }
});
```

---

## API

#### 1. Middleware creation

A middleware is created like this:

```javascript
const uploaderExpress = require("uploaderExpress");

const uploaderMiddleware = uploaderExpress.middleware({
  maxSize: "1tb",
  uploadDir: "./upload",
  tmpDir: "./upload/tmp",
  type: "json",
});
```

Available options:

- **uploadDir**: Directory where files are stored.

  Mandatory

- **tmpDir**: Temporary directory where file are stored during the upload. Once the upload is successfully done the file is copied into uploadDir. In case of error the file is removed

  Optional. Default: [os.tmpdir()](https://nodejs.org/api/os.html#os_os_tmpdir)

- **maxSize**: Maximumn size that the uploader will accept. Any attempt to upload more bytes is rejected.
  Can be an integer or string:

  - an integer is for a size in bytes. maxSize:1024 allow files of 1 kb
  - a string is interpreted by [bytes librarie](https://www.npmjs.com/package/bytes). maxSize:'1kb' is the same than maxSize:1024

  Optional. If not defined uploaderExpress accepts requests of any size.

- **type**: type(extension) added to the file name (ignored if the `generateFileName` option is used)

  Optional. If not defined the file has no extension.

  !! type is only for adding an extension. No validation is performed on the file format.

- **generateFileName**: Function that is used to generate a custom file name based on the incoming request. The `req` object is passed in as a parameter. E.g.:

```js
{
  ...
  generateFileName: req => `${req.params.caseId}.txt`
  ...
}
```

Overide is not supported. If a file with the name exist in the destination directory, this file is preserved and the upload failed.

Optional. If not provided, a random name is generated

- **generateRelativePath**: Function that is used to generate the path of the file relative to the `tmpDir` parameter. The `req` object is passed in as a parameter. E.g.:

```js
{
  ...
  generateRelativePath: req => `${req.params.clientId}.txt`
  ...
}
```

Optional.

Be cautious when using data from the request. A hacker may try to upload a file anywhere on your disk using this. [Here is OSWAP recommendation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

---

#### 2. Middleware usage: success

When the upload is successfull, Express req contains a x_file object:

```javascript
router.post("/customUpload/", uploaderMiddleware, (req, res, next) => {
  res.status(200).json({
    file: req.x_file.name,
    size: req.x_file.size,
  });
});
```

- **name**: the file name
- **size**: the uploaded bytes.

---

#### 3. Middleware usage: Error

In case of error, uploaderExpress generates an error with a status and a name:

```javascript
app.use(function (err, req, res, next) {
  logger.error(
    `Error while processing a request. Request: `,
    { originalUrl: req.originalUrl, headers: req.headers },
    "\nError: ",
    err
  );
  if (err.status) {
    res.status(err.status, err.message);
  } else {
    res.status(500).end("Something goes wrong!");
  }
});
```

- **status**: Http error code
- **message**: http response message, in plain text
