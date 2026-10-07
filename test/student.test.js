const { test } = require('node:test');
const assert = require('node:assert/strict');
const { studentProfile, buildBook } = require('../src/student');

test('MSSV 23IT195 giu nguyen chu, tinh tien to 195 va VAT 11%', () => {
  const student = studentProfile('23IT195', 'Đinh Phúc Tuấn Nhật');
  assert.equal(student.id, '23IT195');
  assert.equal(student.name, 'Đinh Phúc Tuấn Nhật');
  assert.equal(student.dbName, 'DB_23IT195');
  assert.equal(student.prefix, '195');
  assert.equal(student.vatPercent, 11);
});

test('tu choi MSSV khong co 3 chu so cuoi hoac chua ky tu dac biet', () => {
  for (const id of ['', '23IT19', '23IT19A', '23 IT195', '23IT195/']) {
    assert.throws(() => studentProfile(id, 'Đinh Phúc Tuấn Nhật'), /STUDENT_ID/);
  }
});

test('giu so 0 dau cua MSSV va tinh VAT tu chu so cuoi', () => {
  const student = studentProfile('001230', 'Nguyen Van A');
  assert.equal(student.id, '001230');
  assert.equal(student.prefix, '230');
  assert.equal(student.dbName, 'DB_001230');
  assert.equal(student.vatPercent, 6);
});

test('tu choi prefix sai; khong chap nhan gia thue do client tu gui', () => {
  const student = studentProfile('23IT195', 'Đinh Phúc Tuấn Nhật');
  assert.ok(buildBook({ code: '999-B001', title: 'Sach', price: '100000' }, student).error);
  const { book } = buildBook({ code: '195-B001', title: 'Sach', price: '100000', vatPercent: 0, priceAfterVat: 1 }, student);
  assert.equal(book.vatPercent, 11);
  assert.equal(book.priceAfterVat, 111000);
});

test('tu choi gia am, gia le, gia rong va gia qua lon', () => {
  const student = studentProfile('23IT195', 'Đinh Phúc Tuấn Nhật');
  for (const price of ['-1', '12.5', '', '1000000000001', 'NaN']) {
    assert.ok(buildBook({ code: '195-B001', title: 'Sach', price }, student).error);
  }
});