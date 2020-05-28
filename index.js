const fs = require('fs');
const express = require('express');
const basicAuth = require('express-basic-auth');

const { crawl } = require('./crawl');
const { reAuthenticate } = require('./auth');
require('dotenv').config();

const apiKey = process.env.API_KEY;
fs.writeFileSync('./token.txt', apiKey);

const app = express();

app.use(
  basicAuth({
    users: { jonah: process.env.PASSWORD },
    challenge: true,
  }),
);

app.get('/', (req, res) => res.sendFile(`${__dirname}/logfile.txt`));

app.get('/run', async (_, res) => {
  try {
    await crawl();
  } catch (e) {
    console.error('ERROR', e);
    res.sendStatus(500);
    return;
  }

  res.send('OK');
});

app.get('/code/:code', async (req, res) => {
  try {
    const token = await reAuthenticate(req.params.code);
    if (!token) {
      res.sendStatus(204);
      return;
    }
    res.send(token);
    fs.writeFileSync('./token.txt', token);
  } catch (e) {
    console.error('ERROR', e);
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT || 9000);
console.log('Started on', process.env.PORT || 9000);
