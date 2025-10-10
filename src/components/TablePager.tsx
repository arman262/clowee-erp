import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePagerProps {
  totalRows: number;
  rowsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (limit: number) => void;
  className?: string;
  showSerial?: boolean;
}

export function TablePager({
  totalRows,
  rowsPerPage,
  currentPage,
  onPageChange,
  onRowsPerPageChange,
  className = "",
  showSerial = true,
}: TablePagerProps) {
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startRow = (currentPage - 1) * rowsPerPage + 1;
  const endRow = Math.min(currentPage * rowsPerPage, totalRows);
  
  // Helper function to get serial number for a row
  const getSerialNumber = (index: number) => {
    return (currentPage - 1) * rowsPerPage + index + 1;
  };

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((item, index, arr) => arr.indexOf(item) === index && item !== currentPage);
  };

  const handleRowsPerPageChange = (value: string) => {
    const newLimit = value === "all" ? totalRows : parseInt(value);
    onRowsPerPageChange(newLimit);
    onPageChange(1);
  };

  if (totalRows === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 ${className}`}>
      {/* Rows per page selector */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Rows per page:</span>
        <Select
          value={rowsPerPage === totalRows ? "all" : rowsPerPage.toString()}
          onValueChange={handleRowsPerPageChange}
        >
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="500">500</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results info */}
      <div className="text-sm text-muted-foreground">
        Showing {startRow}–{endRow} of {totalRows} items
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                className={`cursor-pointer transition-colors ${
                  currentPage <= 1 ? "pointer-events-none opacity-50" : "hover:bg-accent"
                }`}
              />
            </PaginationItem>

            {getVisiblePages().map((page, index) => (
              <PaginationItem key={index}>
                {page === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => onPageChange(page as number)}
                    isActive={page === currentPage}
                    className="cursor-pointer transition-colors hover:bg-accent"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            {currentPage !== totalPages && totalPages > 1 && (
              <PaginationItem>
                <PaginationLink
                  onClick={() => onPageChange(currentPage)}
                  isActive={true}
                  className="cursor-pointer"
                >
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext
                onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                className={`cursor-pointer transition-colors ${
                  currentPage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-accent"
                }`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}