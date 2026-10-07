const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../src/app');
const { studentProfile } = require('../src/student');

// Adapter gia lap Cloud chi dung trong test; ung dung that dung MongoDB Atlas.
function sharedDatabase() {
  const books = [];
  const sessions = new Map();
  return {
    books,
    sessions,
    booksRead: {
      find() {
        return { sort() { return this; }, limit() { return this; }, async toArray() { return books; } };
      }
    },
    booksWrite: {
      async insertOne(book) {
        if (books.some(value => value.code === book.code)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
        books.push({ ...book });
      }
    },
    sessionsRead: {
      async findOne(query) {
        const row = sessions.get(query._id);
        return row && row.expires > query.expires.$gt ? row : null;
      }
    },
    sessionsWrite: {
      async updateOne(query, change, options = {}) {
        if (sessions.has(query._id) || options.upsert) {
          sessions.set(query._id, { ...sessions.get(query._id), ...change.$set });
        }
      },
      async deleteOne(query) { sessions.delete(query._id); }
    },
    async ping() {}
  };
}

test('hai instance chia se session; validate tren server va render VAT dung', async t => {
  const db = sharedDatabase();
  const config = {
    student: studentProfile('23IT195', 'Đinh Phúc Tuấn Nhật'),
    sessionSecret: 'a'.repeat(64),
    production: false
  };
  async function instance() {
    const server = createApp(config, db).listen(0, '127.0.0.1');
    t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  }
  const first = await instance();
  const second = await instance();
  const response = await fetch(`${first}/books`);
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Đinh Phúc Tuấn Nhật/);
  assert.match(html, /MSSV: 23IT195/);
  assert.match(html, /VAT áp dụng: 10%/);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const csrfToken = html.match(/name="csrfToken" value="([a-f0-9]+)"/)[1];
  const next = await fetch(`${second}/books`, { headers: { cookie } });
  assert.match(await next.text(), /Lượt xem trong phiên: 2/);
  assert.equal(db.sessions.size, 1);

  async function post(fields) {
    return fetch(`${second}/books`, {
      method: 'POST',
      headers: { cookie },
      redirect: 'manual',
      body: new URLSearchParams({ csrfToken, title: 'Sách kiểm thử', price: '100000', ...fields })
    });
  }
  assert.equal((await post({ code: '999-B001' })).status, 400);
  assert.equal(db.books.length, 0);
  assert.equal((await post({ code: '195-B001', vatPercent: '0', priceAfterVat: '1' })).status, 303);
  assert.equal(db.books.length, 1);
  assert.equal(db.books[0].priceAfterVat, 110000);
  assert.equal(db.books[0].vatPercent, 10);
  assert.equal((await post({ code: '195-B001' })).status, 409);

  const third = await instance();
  const resumed = await fetch(`${third}/books`, { headers: { cookie } });
  assert.match(await resumed.text(), /Lượt xem trong phiên: 3/);
  const csrfFailure = await post({ code: '195-B002', csrfToken: 'wrong' });
  assert.equal(csrfFailure.status, 403);
});