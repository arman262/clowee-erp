import React, { useState } from "react";
import { TablePager } from "./TablePager";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Example usage component
export function TablePagerExample() {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Mock data - replace with your actual data
  const mockData = Array.from({ length: 420 }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    status: i % 3 === 0 ? "Active" : i % 3 === 1 ? "Inactive" : "Pending",
    date: new Date(2024, 0, (i % 30) + 1).toLocaleDateString(),
  }));

  const totalRows = mockData.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = mockData.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Table with Pagination Example</h2>
      
      {/* Your table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination component */}
      <TablePager
        totalRows={totalRows}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </div>
  );
}