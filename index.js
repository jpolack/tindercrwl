const fetch = require('node-fetch');
const moment = require('moment');

const { saveRecs } = require('./mongoclient');

const apiKey = process.env.API_KEY;

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
  await run();
  await run();
  await run();
  await run();
  await run();
})();
