import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import styles from './ui.module.css';

export const PAGE_SIZES = [10, 25, 50];

/**
 * Hook de paginado client-side.
 * Preparado para migrar a server-side: basta reemplazar `items.slice`
 * por datos remotos manteniendo `page`, `pageSize` y `total`.
 */
export function usePagination<T>(items: T[], initialPageSize: number = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Si el filtro reduce los resultados, volver a una página válida
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    total,
    totalPages,
    pageItems,
    /** Resetea a la página 1 (útil al cambiar filtros o búsquedas). */
    reset: () => setPage(1),
  };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  /** Sustantivo para el contador, p. ej. "facturas". */
  itemsLabel?: string;
}

/** Números de página con elipsis: 1 … 4 [5] 6 … 20 */
function getPageNumbers(current: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemsLabel = 'registros',
}) => {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.pagination} aria-label="Paginación">
      <span className={styles.paginationInfo}>
        Mostrando {from}–{to} de {total} {itemsLabel}
      </span>

      <div className={styles.paginationControls}>
        <button
          type="button"
          className={styles.paginationBtn}
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          aria-label="Primera página"
        >
          <ChevronsLeft size={15} />
        </button>
        <button
          type="button"
          className={styles.paginationBtn}
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={15} />
        </button>

        <div className={styles.paginationPages}>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e-${i}`} className={styles.paginationBtn} aria-hidden="true" style={{ cursor: 'default' }}>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`${styles.paginationBtn} ${p === page ? styles.paginationBtnActive : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Página ${p}`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <span className={styles.paginationCompact}>
          {page} / {totalPages}
        </span>

        <button
          type="button"
          className={styles.paginationBtn}
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          className={styles.paginationBtn}
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          aria-label="Última página"
        >
          <ChevronsRight size={15} />
        </button>
      </div>

      {onPageSizeChange && (
        <label className={styles.paginationSize}>
          Filas por página
          <select
            className={styles.paginationSizeSelect}
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
          >
            {PAGE_SIZES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
};
