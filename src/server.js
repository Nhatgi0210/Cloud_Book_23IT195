const { openDatabase } = require('./database');
const { createApp } = require('./app');

async function main() {
  const config = require('./config');
  const db = await openDatabase(config);
  const app = createApp(config, db);
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`Book manager listening on port ${config.port}`);
  });
  function stop() {
    server.close(() => {
      db.close().then(() => process.exit(0), () => process.exit(1));
    });
  }
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

main().catch(error => {
  // Khong in URI, secret hay thong bao driver day du.
  console.error('Startup failed:', error.code || error.name || 'Error');
  process.exitCode = 1;
});