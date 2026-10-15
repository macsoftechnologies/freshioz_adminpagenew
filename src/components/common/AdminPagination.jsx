import React from 'react';

export default function AdminPagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 15,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100],
  itemLabel = 'records',
  style = {}
}) {
  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getVisiblePages = () => {
    const pages = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1) {
        pages.push(p);
      }
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderTop: '1px solid #E2E8F0',
      background: '#F8FAFC',
      flexWrap: 'wrap',
      gap: '10px',
      borderRadius: '0 0 12px 12px',
      ...style
    }}>
      {/* Range and total summary */}
      <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{totalItems.toLocaleString()}</strong> {itemLabel}
        </span>
        <span style={{ color: '#CBD5E1' }}>•</span>
        <span>Page <strong>{safeCurrentPage}</strong> of <strong>{totalPages}</strong></span>
      </div>

      {/* Pagination controls & Page Size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {onPageSizeChange && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '11.5px',
                fontWeight: 700,
                background: '#FFFFFF',
                color: '#0F172A',
                cursor: 'pointer'
              }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: safeCurrentPage <= 1 ? '#F1F5F9' : '#FFFFFF',
              color: safeCurrentPage <= 1 ? '#94A3B8' : '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: safeCurrentPage <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            ‹ Previous
          </button>

          {visiblePages.map((page, idx, arr) => {
            const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
            return (
              <React.Fragment key={page}>
                {showEllipsisBefore && (
                  <span style={{ padding: '0 4px', color: '#94A3B8', fontSize: '12px' }}>…</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: safeCurrentPage === page ? '#059669' : '#CBD5E1',
                    background: safeCurrentPage === page ? '#059669' : '#FFFFFF',
                    color: safeCurrentPage === page ? '#FFFFFF' : '#334155',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minWidth: '28px'
                  }}
                >
                  {page}
                </button>
              </React.Fragment>
            );
          })}

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              background: safeCurrentPage >= totalPages ? '#F1F5F9' : '#FFFFFF',
              color: safeCurrentPage >= totalPages ? '#94A3B8' : '#334155',
              fontSize: '12px',
              fontWeight: 700,
              cursor: safeCurrentPage >= totalPages ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Next ›
          </button>
        </div>
      </div>
    </div>
  );
}
