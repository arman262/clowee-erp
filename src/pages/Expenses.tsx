import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Receipt, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  Loader2
} from "lucide-react";
import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { useMachineExpenses, useCreateMachineExpense, useUpdateMachineExpense, useDeleteMachineExpense } from "@/hooks/useMachineExpenses";
import { TablePager } from "@/components/TablePager";
import { usePagination } from "@/hooks/usePagination";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency, formatNumber } from "@/lib/numberUtils";

export default function Expenses() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<any | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);

  const { data: expenses, isLoading } = useMachineExpenses();
  const createExpense = useCreateMachineExpense();
  const updateExpense = useUpdateMachineExpense();
  const deleteExpense = useDeleteMachineExpense();

  const filteredExpenses = expenses?.filter((expense: any) => {
    const matchesSearch = expense.expense_details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !dateFilter || expense.expense_date?.split('T')[0] === dateFilter;
    return matchesSearch && matchesDate;
  }) || [];

  // Today's summary calculations
  const todayExpenses = expenses?.filter((expense: any) => 
    expense.expense_date?.split('T')[0] === dateFilter
  ) || [];
  
  const todayStats = {
    totalExpenses: todayExpenses.length,
    totalAmount: todayExpenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0),
    avgAmount: todayExpenses.length > 0 ? todayExpenses.reduce((sum, exp) => sum + (exp.total_amount || 0), 0) / todayExpenses.length : 0,
    categories: [...new Set(todayExpenses.map(exp => exp.expense_categories?.category_name).filter(Boolean))].length
  };

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedExpenses,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: filteredExpenses });

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

      {/* Today Summary */}
      <Card className="bg-gradient-glass border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Today Summary - {formatDate(dateFilter)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{todayStats.totalExpenses}</div>
                <div className="text-sm text-muted-foreground">Total Expenses</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">৳{formatCurrency(todayStats.totalAmount)}</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">৳{formatCurrency(todayStats.avgAmount)}</div>
                <div className="text-sm text-muted-foreground">Avg Amount</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{todayStats.categories}</div>
                <div className="text-sm text-muted-foreground">Categories Used</div>
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
                placeholder="Search expenses by details or machine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-white" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40 bg-secondary/30 border-border"
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
              <TableHead className="w-16">#</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Unique ID</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Item Price</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  No expenses found
                </TableCell>
              </TableRow>
            ) : (
              paginatedExpenses.map((expense: any, index: number) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {getSerialNumber(index)}
                  </TableCell>
                  <TableCell>{expense.expense_categories?.category_name || '-'}</TableCell>
                  <TableCell>{expense.machines?.machine_name}</TableCell>
                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell>{expense.expense_details}</TableCell>
                  <TableCell>{expense.unique_id || '-'}</TableCell>
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
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this expense?')) {
                            deleteExpense.mutate(expense.id);
                          }
                        }}
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
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Machine</div>
                <div className="font-medium">{viewingExpense.machines?.machine_name}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">{formatDate(viewingExpense.expense_date)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Details</div>
                <div className="font-medium">{viewingExpense.expense_details}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Quantity</div>
                  <div className="font-medium">{viewingExpense.quantity}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Item Price</div>
                  <div className="font-medium">৳{formatCurrency(viewingExpense.item_price)}</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-lg font-bold text-success">৳{formatCurrency(viewingExpense.total_amount)}</div>
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
      

    </div>
  );
}