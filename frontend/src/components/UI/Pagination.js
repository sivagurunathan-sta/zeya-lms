import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5
}) => {
  const generatePageNumbers = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pages = generatePageNumbers();

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center space-x-2">
      {/* First Page */}
      {showFirstLast && currentPage > 1 && (
        <>
          <button
            onClick={() => handlePageChange(1)}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            First
          </button>
        </>
      )}

      {/* Previous Page */}
      {showPrevNext && (
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {/* Page Numbers */}
      {pages[0] > 1 && (
        <>
          <span className="px-3 py-2 text-gray-400">...</span>
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={`px-3 py-2 text-sm rounded-md ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {page}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          <span className="px-3 py-2 text-gray-400">...</span>
        </>
      )}

      {/* Next Page */}
      {showPrevNext && (
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Last Page */}
      {showFirstLast && currentPage < totalPages && (
        <>
          <button
            onClick={() => handlePageChange(totalPages)}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Last
          </button>
        </>
      )}
    </div>
  );
};

export default Pagination;