import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Thư mục gốc là frontend/ (thư mục cha eHRM/ cũng có package-lock.json nên Next có thể đoán sai)
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
