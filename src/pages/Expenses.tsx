import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { TablePager } from "@/components/TablePager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateMachineExpense, useDeleteMachineExpense, useMachineExpenses, useUpdateMachineExpense } from "@/hooks/useMachineExpenses";
import { usePagination } from "@/hooks/usePagination";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate, formatDateTime } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/numberUtils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Edit,
  Eye,
  Loader2,
  Plus,
  Receipt,
  Search,
  Trash2,
  FileDown
} from "lucide-react";
import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';

export default function Expenses() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<any | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<any | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'desc' | 'desc'>('desc');

  const { data: expenses, isLoading } = useMachineExpenses();

  useEffect(() => {
    if (viewingExpense?.employee_id) {
      fetch('http://202.59.208.112:3008/api/employees')
        .then(res => res.json())
        .then(result => {
          const employee = result.data?.find((emp: any) => emp.employee_id === viewingExpense.employee_id);
          setEmployeeName(employee ? `${employee.name} - ${employee.designation}` : viewingExpense.employee_id);
        })
        .catch(() => setEmployeeName(viewingExpense.employee_id));
    } else {
      setEmployeeName('');
    }
  }, [viewingExpense]);
  const createExpense = useCreateMachineExpense();
  const updateExpense = useUpdateMachineExpense();
  const deleteExpense = useDeleteMachineExpense();

  const handleExportExcel = () => {
    const exportData = filteredExpenses.map((expense: any) => ({
      'Expense Date': formatDate(expense.expense_date),
      'Expense ID': expense.expense_number || '-',
      'Category': expense.expense_categories?.category_name || '-',
      'Description': expense.expense_details || '-',
      'Quantity': expense.quantity,
      'Unit Price': expense.item_price,
      'Total Amount': expense.total_amount,
      'Bank': expense.banks?.bank_name || '-',
      'Created At': expense.created_at ? formatDateTime(expense.created_at) : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    const fileName = fromDate && toDate 
      ? `Expenses_${fromDate}_to_${toDate}.xlsx`
      : fromDate 
      ? `Expenses_from_${fromDate}.xlsx`
      : toDate 
      ? `Expenses_to_${toDate}.xlsx`
      : 'Expenses_All.xlsx';
    XLSX.writeFile(wb, fileName);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'desc' ? 'desc' : 'desc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredExpenses = expenses?.filter((expense: any) => {
    const matchesSearch = expense.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.expense_categories?.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (fromDate || toDate) {
      if (!expense.expense_date) return false;
      const date = new Date(expense.expense_date);
      const expenseDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const matchesDateRange = (!fromDate || expenseDateLocal >= fromDate) && (!toDate || expenseDateLocal <= toDate);
      return matchesSearch && matchesDateRange;
    }
    
    return matchesSearch;
  }) || [];

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'category':
        aVal = a.expense_categories?.category_name || '';
        bVal = b.expense_categories?.category_name || '';
        return sortDirection === 'desc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'machine':
        aVal = a.machines?.machine_name || '';
        bVal = b.machines?.machine_name || '';
        return sortDirection === 'desc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'date':
        aVal = new Date(a.expense_date).getTime();
        bVal = new Date(b.expense_date).getTime();
        return sortDirection === 'desc' ? aVal - bVal : bVal - aVal;
      case 'qty':
        aVal = a.quantity || 0;
        bVal = b.quantity || 0;
        return sortDirection === 'desc' ? aVal - bVal : bVal - aVal;
      case 'itemPrice':
        aVal = Number(a.item_price) || 0;
        bVal = Number(b.item_price) || 0;
        return sortDirection === 'desc' ? aVal - bVal : bVal - aVal;
      case 'total':
        aVal = Number(a.total_amount) || 0;
        bVal = Number(b.total_amount) || 0;
        return sortDirection === 'desc' ? aVal - bVal : bVal - aVal;
      case 'bank':
        aVal = a.banks?.bank_name || '';
        bVal = b.banks?.bank_name || '';
        return sortDirection === 'desc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        return 0;
    }
  });

  // Filtered summary calculations
  const conveyanceExpenses = filteredExpenses.filter(exp => exp.expense_categories?.category_name === 'Conveyance');
  const filteredStats = {
    totalExpenses: filteredExpenses.length,
    totalAmount: filteredExpenses.reduce((sum, exp) => sum + Number(exp.total_amount || 0), 0),
    prizePurchaseAmount: filteredExpenses.filter(exp => exp.expense_categories?.category_name === 'Prize Purchase').reduce((sum, exp) => sum + Number(exp.total_amount || 0), 0),
    conveyanceAmount: conveyanceExpenses.reduce((sum, exp) => sum + Number(exp.total_amount || 0), 0)
  };

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedExpenses,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: sortedExpenses });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Machine Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage machine-related expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="border-success text-success hover:bg-success/10"
            onClick={handleExportExcel}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          {canEdit && (
          <Button 
            className="bg-gradient-primary hover:opacity-90 shadow-neon"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          )}
        </div>
      </div>

      {/* Filtered Summary */}
      <Card className="bg-gradient-glass border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {fromDate && toDate ? `Summary: ${formatDate(fromDate)} to ${formatDate(toDate)}` : fromDate ? `Summary from ${formatDate(fromDate)}` : toDate ? `Summary to ${formatDate(toDate)}` : 'All Expenses Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{filteredStats.totalExpenses}</div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">৳{formatCurrency(filteredStats.totalAmount)}</div>
                <div className="text-sm text-muted-foreground">Total Expense Amount</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">৳{formatCurrency(filteredStats.prizePurchaseAmount)}</div>
                <div className="text-sm text-muted-foreground">Prize Purchase</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">৳{formatCurrency(filteredStats.conveyanceAmount)}</div>
                <div className="text-sm text-muted-foreground">Total Conveyance</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by category or machine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36 bg-secondary/30 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36 bg-secondary/30 border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Expenses Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
                <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Expense Date
                  {sortColumn === 'date' ? (sortDirection === 'desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead>Expense Id</TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('category')}>
                <div className="flex items-center gap-1">
                  Category
                  {sortColumn === 'category' ? (sortDirection === 'desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('qty')}>
                <div className="flex items-center gap-1">
                  Qty
                  {sortColumn === 'qty' ? (sortDirection === 'desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('itemPrice')}>
                <div className="flex items-center gap-1">
                  Unit Price
                  {sortColumn === 'itemPrice' ? (sortDirection === 'desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('total')}>
                <div className="flex items-center gap-1">
                  Total Amount
                  {sortColumn === 'total' ? (sortDirection === 'desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('bank')}>
                <div className="flex items-center gap-1">
                  Bank
                  {sortColumn === 'bank' ? (sortDirection === 'desc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  No expenses found
                </TableCell>
              </TableRow>
            ) : (
              paginatedExpenses.map((expense: any, index: number) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell className="font-mono text-sm">{expense.expense_number || '-'}</TableCell>
                  <TableCell>{expense.expense_categories?.category_name || '-'}</TableCell>
                  <TableCell>{expense.item_name || '-'}</TableCell>
                  <TableCell>{expense.quantity}</TableCell>
                  <TableCell>৳{formatCurrency(expense.item_price)}</TableCell>
                  <TableCell>৳{formatCurrency(expense.total_amount)}</TableCell>
                  <TableCell>{expense.banks?.bank_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingExpense(expense)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                      <>
                      <Dialog open={editingExpense?.id === expense.id} onOpenChange={(open) => !open && setEditingExpense(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingExpense(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogTitle className="sr-only">Edit Expense</DialogTitle>
                          <DialogDescription className="sr-only">Edit expense record</DialogDescription>
                          <ExpenseForm
                            initialData={expense}
                            onSubmit={(data) => {
                              updateExpense.mutate({ id: expense.id, ...data });
                              setEditingExpense(null);
                            }}
                            onCancel={() => setEditingExpense(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingExpense(expense)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
            {paginatedExpenses.length > 0 && (
              <TableRow className="bg-secondary/50 font-bold">
                <TableCell colSpan={4} className="text-right">Total:</TableCell>
                <TableCell>{filteredExpenses.reduce((sum, exp) => sum + (Number(exp.quantity) || 0), 0)}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>৳{formatCurrency(filteredExpenses.reduce((sum, exp) => sum + (Number(exp.total_amount) || 0), 0))}</TableCell>
                <TableCell colSpan={2}></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <TablePager
        totalRows={totalRows}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
      
      {/* Add Expense Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Add New Expense</DialogTitle>
          <DialogDescription className="sr-only">Add a new expense record</DialogDescription>
          <ExpenseForm
            onSubmit={(data) => {
              createExpense.mutate(data);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Expense Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewingExpense(null)}>
          <Card className="bg-gradient-card border-border shadow-card max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Expense Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {viewingExpense.employee_id ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Employee</div>
                  <div className="font-medium">{employeeName || 'Loading...'}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Machine</div>
                  <div className="font-medium">{viewingExpense.machines?.machine_name || '-'}</div>
                </div>
              )}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">{formatDate(viewingExpense.expense_date)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Descriptions</div>
                <div className="font-medium">{viewingExpense.expense_details}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Quantity</div>
                  <div className="font-medium">{viewingExpense.quantity}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Unit Price</div>
                  <div className="font-medium">৳{formatCurrency(viewingExpense.item_price)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-lg font-bold text-success">৳{formatCurrency(viewingExpense.total_amount)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Entry Date</div>
                <div className="text-lg font-bold text-success">{viewingExpense.created_at ? formatDateTime(viewingExpense.created_at) : '-'}</div>
              </div>
              
              



              {viewingExpense.banks && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Bank</div>
                  <div className="font-medium">{viewingExpense.banks.bank_name}</div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button onClick={() => setViewingExpense(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
        onConfirm={() => deleteExpense.mutate(deletingExpense.id)}
        title="Delete Expense"
        description="Are you sure you want to delete this expense?"
        details={[
          { label: "Category", value: deletingExpense?.expense_categories?.category_name || '-' },
          { label: "Machine", value: deletingExpense?.machines?.machine_name || '-' },
          { label: "Date", value: deletingExpense ? formatDate(deletingExpense.expense_date) : '' },
          { label: "Details", value: deletingExpense?.expense_details || '-' },
          { label: "Total Amount", value: deletingExpense ? `৳${formatCurrency(deletingExpense.total_amount)}` : '' }
        ]}
      />

    </div>
  );
}