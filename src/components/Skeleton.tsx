import React from 'react';
import styles from './ui.module.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, style, className }) => (
  <div
    className={`${styles.skeleton} ${className || ''}`}
    style={{ width, height, ...style }}
    aria-hidden="true"
  />
);

/** Esqueleto de tabla: n filas simuladas. */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} height={38} />
    ))}
  </div>
);

/** Esqueleto de tarjeta KPI. */
export const KpiSkeleton: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    <Skeleton width={120} height={12} />
    <Skeleton width={160} height={28} />
    <Skeleton width={110} height={18} />
  </div>
);
