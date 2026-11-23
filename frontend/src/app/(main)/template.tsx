import { PageTransition } from '@/components/motion';

/** template.tsx được tạo lại mỗi lần chuyển trang → chạy hiệu ứng vào trang */
export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
