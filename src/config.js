require('dotenv').config();
const { studentProfile } = require('./student');

const student = studentProfile(process.env.STUDENT_ID, process.env.STUDENT_NAME);
const readUri = process.env.MONGO_READ_URI;
const writeUri = process.env.MONGO_WRITE_URI;
const sessionSecret = process.env.SESSION_SECRET;
const port = Number(process.env.PORT || 3000);

for (const [name, value] of Object.entries({ MONGO_READ_URI: readUri, MONGO_WRITE_URI: writeUri })) {
  if (!value || !/^mongodb(?:\+srv)?:\/\//.test(value) || value.includes('THAY_')) {
    throw new Error(`${name} chua duoc cau hinh dung.`);
  }
}
if (!sessionSecret || sessionSecret.length < 32 || sessionSecret.startsWith('THAY_')) {
  throw new Error('SESSION_SECRET phai la chuoi ngau nhien toi thieu 32 ky tu.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT khong hop le.');
}

module.exports = {
  student, readUri, writeUri, sessionSecret, port,
  production: process.env.NODE_ENV === 'production'
};