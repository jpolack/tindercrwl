const fetch = require('node-fetch');
const moment = require('moment');
const fs = require('fs');
require('dotenv').config();

const { saveRecs } = require('./mongoclient');

const apiKey = fs.readFileSync('./token.txt', { encoding: 'UTF-8' });

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
  photoUrls: photos
    .map((photo) => photo.url)
    .concat(
      ((instagram && (instagram.photos || [])) || []).map(
        (instaphoto) => instaphoto.image,
      ),
    ),
});

const keep = ({ gender }) => gender === 1;

const run = async () => {
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

    console.log('Authentification sent:', authRes.status, await authRes.text());
    return;
  }

  if (res.status !== 200) {
    console.log('Unhandled Error', res.status, await res.text());
    return;
  }

  const recs = await res.json();

  const mapped = recs.results
    .filter(keep)
    .map(mapRecs);


  const insertedUserCount = await saveRecs(mapped);

  console.log(`saved ${mapped.length} users, ${insertedUserCount} inserts`);

  // eslint-disable-next-line no-underscore-dangle
  await fetch(`https://api.gotinder.com/pass/${mapped[0]._id}`, {
    headers: {
      'x-auth-token': apiKey,
      'User-Agent': 'Tinder/7.5.3 (iPhone; iOS 10.3.2; Scale/2.00)',
    },
  });

  console.log('Reset via:', mapped[0].name);
};


(async () => {
  try {
    await run();
  } catch (e) {
    console.error('ERROR:', e);
  }
})();
