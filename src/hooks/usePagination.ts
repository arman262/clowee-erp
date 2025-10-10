import { useState, useMemo } from "react";

interface UsePaginationProps<T> {
  data: T[];
  initialRowsPerPage?: number;
}

export function usePagination<T>({ data, initialRowsPerPage = 25 }: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return data.slice(startIndex, startIndex + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  const totalRows = data.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const getSerialNumber = (index: number) => {
    return (currentPage - 1) * rowsPerPage + index + 1;
  };

  return {
    currentPage,
    rowsPerPage,
    totalRows,
    totalPages,
    paginatedData,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  };
}