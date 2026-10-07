const { MongoClient } = require('mongodb');

async function openDatabase(config) {
  const options = { serverSelectionTimeoutMS: 10000 };
  const readClient = new MongoClient(config.readUri, options);
  const writeClient = new MongoClient(config.writeUri, options);
  const readDb = readClient.db(config.student.dbName);
  const writeDb = writeClient.db(config.student.dbName);

  async function ping() {
    await Promise.all([
      readDb.command({ ping: 1 }),
      writeDb.command({ ping: 1 })
    ]);
  }

  try {
    await readClient.connect();
    await writeClient.connect();
    await ping();
  } catch (error) {
    await Promise.allSettled([readClient.close(), writeClient.close()]);
    throw error;
  }

  return {
    booksRead: readDb.collection('books'),
    booksWrite: writeDb.collection('books'),
    sessionsRead: readDb.collection('sessions'),
    sessionsWrite: writeDb.collection('sessions'),
    ping,
    async close() {
      await Promise.all([readClient.close(), writeClient.close()]);
    }
  };
}

module.exports = { openDatabase };
