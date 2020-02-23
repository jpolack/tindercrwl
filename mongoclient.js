const { MongoClient } = require('mongodb');

const mongoURL = process.env.MONGODB_URI;

const dbName = process.env.DB_NAME;


const saveRecs = async (recs) => {
  const client = await MongoClient.connect(mongoURL);
  console.log('Connected successfully to server');

  const db = client.db(dbName);

  const collection = db.collection('tinderusers');

  const insertedUserCount = recs.reduce(async (accumulator, rec) => {
    const updateRes = await collection.updateOne(
      {
        _id: {
          // eslint-disable-next-line no-underscore-dangle
          $eq: rec._id,
        },
      },
      { $set: rec },
      { upsert: true },
    );

    const resolvedAccumulator = await accumulator;

    return Promise.resolve(
      updateRes.modifiedCount === 0 ? resolvedAccumulator + 1 : resolvedAccumulator,
    );
  }, Promise.resolve(0));
  client.close();

  return insertedUserCount;
};

module.exports = { saveRecs };
