'use client';

import { animate, motion, useInView, useMotionValue, useTransform, type Variants } from 'motion/react';
import { useEffect, useRef } from 'react';

/** Lò xo kiểu macOS: nhanh, dừng êm, không nảy nhiều */
export const spring = { type: 'spring', stiffness: 420, damping: 36, mass: 0.9 } as const;
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 } as const;
export const easeApple = [0.32, 0.72, 0, 1] as const;

/** Hiệu ứng vào trang duy nhất: nội dung hiện dần và nhích lên 8px */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: easeApple }}
    >
      {children}
    </motion.div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: easeApple } },
};

/** Các phần tử con xuất hiện lần lượt (dùng cùng <StaggerItem>) */
export function Stagger({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={container} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}

/** Số đếm tăng dần tới giá trị đích */
export function AnimatedNumber({ value, duration = 0.9 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString('vi-VN'));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration, ease: easeApple });
    return () => controls.stop();
  }, [inView, value, duration, mv]);

  return <motion.span ref={ref}>{rounded}</motion.span>;
}

/** Thanh tiến độ chạy từ 0 tới phần trăm đích */
export function AnimatedBar({ percent, className, delay = 0 }: { percent: number; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ width: 0 }}
      animate={{ width: `${percent}%` }}
      transition={{ duration: 0.8, ease: easeApple, delay }}
    />
  );
}
