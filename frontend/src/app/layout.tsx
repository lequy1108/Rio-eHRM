import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: { default: 'eHRM - Quản lý nhân sự', template: '%s | eHRM' },
  description: 'Hệ thống quản lý nhân sự điện tử',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes và extension trình duyệt thêm thuộc tính vào <html>/<body>
    <html lang="vi" suppressHydrationWarning>
      <body className={font.className} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
