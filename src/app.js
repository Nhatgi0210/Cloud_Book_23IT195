const path = require('node:path');
const { randomBytes } = require('node:crypto');
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const { SplitMongoSessionStore } = require('./session-store');
const { buildBook } = require('./student');

function createApp(config, db) {
  const app = express();
  app.disable('x-powered-by');
  if (config.production) app.set('trust proxy', 1);
  app.engine('handlebars', engine({
    defaultLayout: 'main',
    helpers: { money: value => new Intl.NumberFormat('vi-VN').format(Number(value)) }
  }));
  app.set('view engine', 'handlebars');
  app.set('views', path.join(__dirname, '../views'));

  // Health check khong tao hay sua session.
  app.get('/healthz', async (req, res) => {
    try {
      await db.ping();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  app.use(express.static(path.join(__dirname, '../public')));
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(session({
    name: `books.sid.${config.student.id}`,
    secret: config.sessionSecret,
    store: new SplitMongoSessionStore(db.sessionsRead, db.sessionsWrite),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: config.production,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  }));
  app.use((req, res, next) => {
    res.locals.student = config.student;
    res.set('Cache-Control', 'no-store');
    next();
  });

  async function renderBooks(req, res, options = {}) {
    const books = await db.booksRead.find({}).sort({ createdAt: -1 }).limit(100).toArray();
    res.status(options.status || 200).render('books', {
      books: books.map(({ _id, ...book }) => book),
      visits: req.session.visits || 0,
      csrfToken: req.session.csrfToken,
      values: options.values || {},
      error: options.error,
      success: options.success
    });
  }

  app.get('/', (req, res) => res.redirect('/books'));
  app.get('/books', async (req, res) => {
    req.session.visits = (req.session.visits || 0) + 1;
    if (!req.session.csrfToken) req.session.csrfToken = randomBytes(24).toString('hex');
    const success = req.session.notice;
    delete req.session.notice;
    await renderBooks(req, res, { success });
  });

  app.post('/books', async (req, res) => {
    if (!req.session.csrfToken || req.body.csrfToken !== req.session.csrfToken) {
      return res.status(403).send('Phien khong hop le. Hay tai lai trang va thu lai.');
    }
    const result = buildBook(req.body, config.student);
    if (result.error) {
      return renderBooks(req, res, { status: 400, error: result.error, values: req.body });
    }
    try {
      await db.booksWrite.insertOne(result.book);
    } catch (error) {
      if (error.code === 11000) {
        return renderBooks(req, res, { status: 409, error: 'Ma sach da ton tai.', values: req.body });
      }
      throw error;
    }
    req.session.notice = 'Da them sach va luu gia sau thue len MongoDB Atlas.';
    // Cho Atlas luu session xong roi moi redirect sang request moi.
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    res.redirect(303, '/books');
  });

  app.use((req, res) => res.status(404).render('error', { message: 'Khong tim thay trang.' }));
  app.use((error, req, res, next) => {
    console.error('Request failed:', error.code || error.name || 'Error');
    if (res.headersSent) return next(error);
    res.status(500).render('error', { message: 'Khong the xu ly luc nay. Vui long thu lai.' });
  });
  return app;
}

module.exports = { createApp };