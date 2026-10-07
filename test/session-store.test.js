const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SplitMongoSessionStore } = require('../src/session-store');

function fixture() {
  const documents = new Map();
  const calls = [];
  const reader = {
    async findOne(query) {
      calls.push('read.findOne');
      const doc = documents.get(query._id);
      return doc && doc.expires > query.expires.$gt ? doc : null;
    }
  };
  const writer = {
    async updateOne(query, change, options = {}) {
      calls.push('write.updateOne');
      if (documents.has(query._id) || options.upsert) {
        documents.set(query._id, { ...documents.get(query._id), ...change.$set });
      }
    },
    async deleteOne(query) {
      calls.push('write.deleteOne');
      documents.delete(query._id);
    }
  };
  return { documents, calls, store: new SplitMongoSessionStore(reader, writer) };
}

function invoke(store, method, ...args) {
  return new Promise((resolve, reject) => {
    store[method](...args, (error, value) => error ? reject(error) : resolve(value));
  });
}

test('session doc bang Read, ghi/cap nhat/xoa bang Write; touch khong ghi de du lieu', async () => {
  const { documents, calls, store } = fixture();
  const initial = { cookie: { expires: new Date(Date.now() + 10000) }, visits: 7 };
  await invoke(store, 'set', 'sid-1', initial);
  assert.equal((await invoke(store, 'get', 'sid-1')).visits, 7);
  const originalJson = documents.get('sid-1').session;
  await invoke(store, 'touch', 'sid-1', { cookie: { expires: new Date(Date.now() + 20000) }, visits: 99 });
  assert.equal(documents.get('sid-1').session, originalJson);
  await invoke(store, 'destroy', 'sid-1');
  assert.equal(await invoke(store, 'get', 'sid-1'), null);
  assert.deepEqual(calls, ['write.updateOne', 'read.findOne', 'write.updateOne', 'write.deleteOne', 'read.findOne']);
});

test('session het han bi tu choi ngay ca khi TTL chua xoa document', async () => {
  const { documents, store } = fixture();
  documents.set('old', { session: JSON.stringify({ visits: 3 }), expires: new Date(Date.now() - 1000) });
  assert.equal(await invoke(store, 'get', 'old'), null);
});

test('loi cloud duoc truyen ve middleware thay vi roi sang MemoryStore', async () => {
  const store = new SplitMongoSessionStore({ findOne: async () => { throw new Error('Cloud offline'); } }, {});
  await assert.rejects(invoke(store, 'get', 'sid'), /Cloud offline/);
});