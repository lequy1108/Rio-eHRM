// Tạo file .env từ .env.example nếu chưa có (chạy tự động trong `npm run install:all`)
const fs = require('fs');
const path = require('path');

const pairs = [
  ['backend/.env.example', 'backend/.env'],
  ['frontend/.env.example', 'frontend/.env.local'],
];

for (const [src, dest] of pairs) {
  const from = path.join(__dirname, '..', src);
  const to = path.join(__dirname, '..', dest);
  if (fs.existsSync(to)) {
    console.log(`= ${dest} đã có, giữ nguyên`);
  } else {
    fs.copyFileSync(from, to);
    console.log(`+ Đã tạo ${dest}`);
  }
}
