const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MongoClient, Db } = require('mongodb');
const { openDatabase } = require('../src/database');

const config = {
  readUri: 'mongodb://read.example:27017',
  writeUri: 'mongodb://write.example:27017',
  student: { dbName: 'DB_23IT195' }
};

test('database dung hai client rieng, chon dung collections va kiem tra ca hai ket noi', async t => {
  const connected = [];
  const closed = [];
  const pings = [];
  let offline = false;
  t.mock.method(MongoClient.prototype, 'connect', async function () {
    connected.push(this);
    return this;
  });
  t.mock.method(MongoClient.prototype, 'close', async function () { closed.push(this); });
  t.mock.method(Db.prototype, 'command', async function (command) {
    pings.push({ client: this.client, name: this.databaseName, command });
    if (offline && this.client === connected[1]) throw new Error('Write offline');
    return { ok: 1 };
  });

  const db = await openDatabase(config);
  assert.equal(connected.length, 2);
  assert.notEqual(connected[0], connected[1]);
  for (const [collection, name, client] of [
    [db.booksRead, 'books', connected[0]],
    [db.booksWrite, 'books', connected[1]],
    [db.sessionsRead, 'sessions', connected[0]],
    [db.sessionsWrite, 'sessions', connected[1]]
  ]) {
    assert.equal(collection.dbName, 'DB_23IT195');
    assert.equal(collection.collectionName, name);
    assert.equal(collection.client, client);
  }
  assert.deepEqual(pings, connected.map(client => ({ client, name: 'DB_23IT195', command: { ping: 1 } })));
  await db.ping();
  assert.equal(pings.length, 4);
  offline = true;
  await assert.rejects(db.ping(), /Write offline/);
  await db.close();
  assert.deepEqual(closed, connected);
});

test('database dong ca hai client khi khoi dong that bai va giu nguyen loi ket noi', async t => {
  const connected = [];
  const closed = [];
  const failure = new Error('Write connection failed');
  t.mock.method(MongoClient.prototype, 'connect', async function () {
    connected.push(this);
    if (connected.length === 2) throw failure;
    return this;
  });
  t.mock.method(MongoClient.prototype, 'close', async function () {
    closed.push(this);
    if (closed.length === 1) throw new Error('Close failed');
  });
  await assert.rejects(openDatabase(config), error => error === failure);
  assert.deepEqual(closed, connected);
});
