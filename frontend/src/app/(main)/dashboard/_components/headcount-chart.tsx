'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TrendPoint {
  month: string; // 'YYYY-MM'
  total: number;
  hires: number;
}

const W = 720;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 32 };

const label = (m: string) => `T${Number(m.slice(5))}`;
const fullLabel = (m: string) => `Tháng ${Number(m.slice(5))}/${m.slice(0, 4)}`;

/** Đường cong mượt qua các điểm (monotone, không vọt quá giá trị thật) */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return '';
  const n = pts.length;
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const m = pts.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/**
 * Biểu đồ chính của Bảng điều khiển: tổng nhân sự cuối mỗi tháng (đường, màu nhấn)
 * và số người vào làm trong tháng (cột, màu trung tính).
 */
export function HeadcountChart({ data }: { data: TrendPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const maxTotal = Math.max(...data.map((d) => d.total), 1);
    const top = Math.max(4, Math.ceil((maxTotal * 1.25) / 4) * 4);
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const step = innerW / Math.max(data.length - 1, 1);
    const x = (i: number) => PAD.left + i * step;
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
    const pts = data.map((d, i) => [x(i), y(d.total)] as [number, number]);
    const line = smoothPath(pts);
    const area = `${line} L${x(data.length - 1)},${PAD.top + innerH} L${x(0)},${PAD.top + innerH} Z`;
    const ticks = [0, 1, 2, 3, 4].map((k) => Math.round((top / 4) * k));
    const maxHires = Math.max(...data.map((d) => d.hires), 1);
    const barH = (v: number) => (v / maxHires) * innerH * 0.28;
    return { x, y, pts, line, area, ticks, innerH, step, barH };
  }, [data]);

  const last = data.length - 1;
  const active = hover ?? last;
  const a = data[active];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-[28px] leading-none font-medium tabular-nums">{a?.total ?? 0}</span>
        <span className="text-sm text-muted-foreground">
          người · {a ? fullLabel(a.month) : ''}
          {a && a.hires > 0 && <> · {a.hires} người mới vào</>}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full select-none"
        role="img"
        aria-label="Tổng nhân sự theo tháng trong 12 tháng gần nhất"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="hc-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Lưới và nhãn trục */}
        {geo.ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={geo.y(t)}
              y2={geo.y(t)}
              stroke="currentColor"
              className="text-border"
              strokeDasharray={t === 0 ? undefined : '2 4'}
            />
            <text x={PAD.left - 8} y={geo.y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
              {t}
            </text>
          </g>
        ))}

        {/* Người vào làm trong tháng: cột trung tính sát đáy */}
        {data.map((d, i) =>
          d.hires > 0 ? (
            <rect
              key={`b-${d.month}`}
              x={geo.x(i) - 6}
              y={PAD.top + geo.innerH - geo.barH(d.hires)}
              width={12}
              height={geo.barH(d.hires)}
              rx={3}
              className={cn('fill-foreground/12', i === active && 'fill-foreground/25')}
            />
          ) : null,
        )}

        <path d={geo.area} fill="url(#hc-area)" />
        <path d={geo.line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Điểm đang xem */}
        <line
          x1={geo.x(active)}
          x2={geo.x(active)}
          y1={PAD.top}
          y2={PAD.top + geo.innerH}
          stroke="currentColor"
          className="text-foreground/15"
        />
        <circle cx={geo.pts[active]?.[0]} cy={geo.pts[active]?.[1]} r={4.5} fill="var(--card)" stroke="var(--primary)" strokeWidth={2} />

        {/* Nhãn tháng */}
        {data.map((d, i) => (
          <text
            key={`l-${d.month}`}
            x={geo.x(i)}
            y={H - 8}
            textAnchor="middle"
            className={cn('font-mono text-[11px]', i === active ? 'fill-foreground' : 'fill-muted-foreground')}
          >
            {label(d.month)}
          </text>
        ))}

        {/* Vùng rê chuột cho từng tháng */}
        {data.map((d, i) => (
          <rect
            key={`h-${d.month}`}
            x={geo.x(i) - geo.step / 2}
            y={0}
            width={geo.step}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-primary" /> Tổng nhân sự cuối tháng
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-foreground/15" /> Người vào làm trong tháng
        </span>
      </div>
    </div>
  );
}
