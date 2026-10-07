function studentProfile(studentId, studentName) {
  const id = String(studentId ?? '').trim();
  const name = String(studentName ?? '').trim();
  if (!/^[A-Za-z0-9]*\d{3}$/.test(id)) {
    throw new Error('STUDENT_ID chi gom chu/so va phai ket thuc bang 3 chu so.');
  }
  if (!name) throw new Error('Thieu STUDENT_NAME.');
  return {
    id,
    name,
    dbName: `DB_${id}`,
    prefix: id.slice(-3),
    vatPercent: Number(id.slice(-1)) + 6
  };
}

function buildBook(input, student) {
  const code = typeof input.code === 'string' ? input.code.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const author = typeof input.author === 'string' ? input.author.trim() : '';
  const rawPrice = typeof input.price === 'string' ? input.price.trim() : '';
  const price = Number(rawPrice);

  if (!code.startsWith(student.prefix)) {
    return { error: `Ma sach phai bat dau bang ${student.prefix}.` };
  }
  if (!/^[A-Za-z0-9-]{3,50}$/.test(code)) {
    return { error: 'Ma sach chi gom chu, so va dau -, toi da 50 ky tu.' };
  }
  if (!title || title.length > 150 || author.length > 100) {
    return { error: 'Ten sach bat buoc, toi da 150 ky tu; tac gia toi da 100 ky tu.' };
  }
  if (!/^\d+$/.test(rawPrice) || !Number.isSafeInteger(price) || price > 1_000_000_000_000) {
    return { error: 'Gia phai la so nguyen VND tu 0 den 1.000.000.000.000.' };
  }

  return {
    book: {
      code,
      title,
      author,
      price,
      vatPercent: student.vatPercent,
      priceAfterVat: Math.round(price * (100 + student.vatPercent) / 100),
      createdAt: new Date()
    }
  };
}

module.exports = { studentProfile, buildBook };