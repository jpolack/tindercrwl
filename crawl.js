const fetch = require('node-fetch');
const moment = require('moment');
const delay = require('delay');
const fs = require('fs');
require('dotenv').config();

const { saveRecs } = require('./mongoclient');

let logFile = [];
const resetLog = () => { logFile = []; };
const log = (...args) => {
  console.log(...args);
  logFile.push(args
    .map((l) => JSON.stringify(l, null, 2))
    .join(' '));
};

const mapRecs = ({
  _id,
  bio,
  name,
  photos,
  instagram,
  jobs,
  schools,
  // eslint-disable-next-line camelcase
  birth_date,
  city,
}) => ({
  _id,
  bio,
  name,
  city,
  jobs,
  schools,
  age: moment(birth_date).fromNow(),
  likedOn: new Date(),
  photoUrls: photos
    .map((photo) => photo.url)
    .concat(
      ((instagram && (instagram.photos || [])) || []).map(
        (instaphoto) => instaphoto.image,
      ),
    ),
});

// eslint-disable-next-line camelcase
const keep = ({ gender, distance_mi }) => gender === 1 && distance_mi <= 100;

const getRecs = async (apiKey) => {
  const res = await fetch('https://api.gotinder.com/user/recs', {
    headers: {
      'x-auth-token': apiKey,
      'User-Agent': 'Tinder/7.5.3 (iPhone; iOS 10.3.2; Scale/2.00)',
    },
  });

  if (res.status === 401) {
    // auth error
    const authRes = await fetch(
      'https://api.gotinder.com/v2/auth/sms/send?auth_type=sms',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          phone_number: process.env.PHONE,
        }),
      },
    );

    log('Authentification sent:', authRes.status, await authRes.text());
    return undefined;
  }

  if (res.status !== 200) {
    log('Unhandled Error', res.status, await res.text());
    return undefined;
  }

  const recs = await res.json();

  const mapped = recs.results.filter(keep).map(mapRecs);

  const savedCount = await saveRecs(mapped);
  log('Saved', savedCount, 'profiles');

  return mapped;
};

const likeAllRecs = async () => {
  const apiKey = fs.readFileSync(
    './token.txt',
    { encoding: 'UTF-8' },
  );

  const recs = await getRecs(apiKey);

  if (!recs) {
    return false;
  }

  // eslint-disable-next-line no-restricted-syntax
  for await (const rec of recs) {
    const pause = (Math.floor((Math.random() * 1.5) * 100)) / 100;
    log('Liking', rec.name, 'after', pause, 'seconds');
    await delay(pause * 1000);
    // eslint-disable-next-line no-underscore-dangle
    const res = await fetch(`https://api.gotinder.com/like/${rec._id}`, {
      headers: {
        'x-auth-token': apiKey,
        'User-Agent': 'Tinder/7.5.3 (iPhone; iOS 10.3.2; Scale/2.00)',
      },
    });
    if (res.status !== 200) {
      log('ERROR', res.status, await res.text());
      return false;
    }
  }

  return true;
};

const likeTilError = async (count) => {
  if (count === 0) {
    log('All iterations done');
    return;
  }
  log('Remainig iterations', count);
  const success = await likeAllRecs();
  if (!success) {
    log('Breaking because of error');
    return;
  }
  await likeTilError(count - 1);
};

const run = async () => {
  resetLog();
  log('Starting at:', new Date());
  await likeTilError(Number(process.env.ITERATIONS) || 1);
  fs.writeFileSync('./logfile.txt', logFile.join('\n'));
};

module.exports = {
  crawl: run,
};
