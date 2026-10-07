const session = require('express-session');

// Khong co Map hay cache session trong RAM. Moi thao tac truy cap Atlas.
// get -> Read; set/touch/destroy -> Write. Khong can tai khoan thu ba.
class SplitMongoSessionStore extends session.Store {
  constructor(readCollection, writeCollection, ttlMs = 24 * 60 * 60 * 1000) {
    super();
    this.reader = readCollection;
    this.writer = writeCollection;
    this.ttlMs = ttlMs;
  }

  expiresFor(value) {
    const raw = value.cookie && value.cookie.expires;
    const expires = raw ? new Date(raw) : new Date(Date.now() + this.ttlMs);
    if (!Number.isFinite(expires.getTime())) throw new Error('Invalid session expiry');
    return expires;
  }

  get(sid, callback) {
    this.reader.findOne({ _id: sid, expires: { $gt: new Date() } })
      .then(doc => doc ? JSON.parse(doc.session) : null)
      .then(value => callback(null, value), callback);
  }

  set(sid, value, callback = () => {}) {
    let fields;
    try {
      fields = { session: JSON.stringify(value), expires: this.expiresFor(value) };
    } catch (error) {
      return callback(error);
    }
    this.writer.updateOne({ _id: sid }, { $set: fields }, { upsert: true })
      .then(() => callback(null), callback);
  }

  destroy(sid, callback = () => {}) {
    this.writer.deleteOne({ _id: sid }).then(() => callback(null), callback);
  }

  touch(sid, value, callback = () => {}) {
    let expires;
    try {
      expires = this.expiresFor(value);
    } catch (error) {
      return callback(error);
    }
    this.writer.updateOne({ _id: sid }, { $set: { expires } })
      .then(() => callback(null), callback);
  }
}

module.exports = { SplitMongoSessionStore };