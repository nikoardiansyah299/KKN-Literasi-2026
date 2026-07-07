const path = require('path');
const express = require('express');

const apiApp = require('./server/src/server');

const staticDir = path.join(__dirname, 'client', 'dist');
const app = express();

app.use(express.static(staticDir));
app.use(apiApp);

app.get('*', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

module.exports = app;
module.exports.default = app;
