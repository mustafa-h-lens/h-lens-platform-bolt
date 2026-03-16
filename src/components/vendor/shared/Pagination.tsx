import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '12px 0' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: '1px solid var(--border)', color: 'var(--textSec)',
          cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.3 : 1,
          fontFamily: 'Cairo, sans-serif',
        }}
      >
        <ChevronRight size={16} />
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--textMut)', fontSize: '.8rem' }}>...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={{
              minWidth: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: currentPage === p ? 'var(--tagBg)' : 'none',
              border: `1px solid ${currentPage === p ? 'var(--borderHi)' : 'var(--border)'}`,
              color: currentPage === p ? 'var(--tagC)' : 'var(--textSec)',
              fontWeight: currentPage === p ? 700 : 400,
              fontSize: '.8rem', cursor: 'pointer', fontFamily: 'Cairo, sans-serif',
              padding: '0 6px',
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: '1px solid var(--border)', color: 'var(--textSec)',
          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.3 : 1,
          fontFamily: 'Cairo, sans-serif',
        }}
      >
        <ChevronLeft size={16} />
      </button>

      <span style={{ fontSize: '.72rem', color: 'var(--textMut)', marginRight: 8 }}>
        {totalItems} عنصر
      </span>
    </div>
  );
}
