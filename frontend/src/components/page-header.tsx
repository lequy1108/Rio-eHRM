import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface Crumb {
  label: string;
  href?: string;
}

/** Tiêu đề trang + breadcrumb + nút hành động bên phải */
export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 space-y-2">
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Trang chủ
        </Link>
        {breadcrumbs.map((c) => (
          <span key={c.label} className="flex items-center gap-1">
            <ChevronRight className="size-3.5" />
            {c.href ? (
              <Link href={c.href} className="hover:text-foreground">
                {c.label}
              </Link>
            ) : (
              <span className="text-foreground">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] leading-tight font-medium">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
