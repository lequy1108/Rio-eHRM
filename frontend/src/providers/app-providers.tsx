'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrandingEffect } from '@/lib/branding';
import { AuthProvider } from './auth-provider';
import { ConfirmProvider } from './confirm-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
        // Mọi thao tác thêm/sửa/xoá lỗi đều hiện toast, trừ khi mutation tự xử lý (meta.silent)
        mutationCache: new MutationCache({
          onError: (error, _v, _c, mutation) => {
            if (!mutation.meta?.silent) toast.error(error.message);
          },
        }),
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {/* reducedMotion="user": tôn trọng tuỳ chọn "Giảm chuyển động" của hệ điều hành */}
      <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <BrandingEffect />
        <TooltipProvider>
          <AuthProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </AuthProvider>
        </TooltipProvider>
        <Toaster position="top-right" richColors closeButton toastOptions={{ className: 'backdrop-blur-xl' }} />
      </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
