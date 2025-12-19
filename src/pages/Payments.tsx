import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  CreditCard, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  Loader2,
  Building,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileDown
} from "lucide-react";
import * as XLSX from 'xlsx';
import { PaymentForm } from "@/components/forms/PaymentForm";
import { useMachinePayments, useCreateMachinePayment, useUpdateMachinePayment, useDeleteMachinePayment } from "@/hooks/useMachinePayments";
import { TablePager } from "@/components/TablePager";
import { usePagination } from "@/hooks/usePagination";
import { formatDate } from "@/lib/dateUtils";

export default function Payments() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<any | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<any | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: payments, isLoading } = useMachinePayments();
  const createPayment = useCreateMachinePayment();
  const updatePayment = useUpdateMachinePayment();
  const deletePayment = useDeleteMachinePayment();

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExportExcel = () => {
    const exportData = sortedPayments.map((payment: any, index: number) => ({
      'SL': index + 1,
      'Invoice No': payment.sales?.invoice_number || (payment.sales ? `CLW/${new Date(payment.sales.sales_date).getFullYear()}/${payment.sales.id.slice(-3).padStart(3, '0')}` : 'N/A'),
      'Machine': payment.machines?.machine_name || '',
      'Payment Date': formatDate(payment.payment_date),
      'Amount': payment.amount,
      'Bank': payment.banks?.bank_name || '',
      'Remarks': payment.remarks || '',
      'Created By': payment.created_by_user?.name || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredPayments = payments?.filter((payment: any) => {
    // Search filter
    const matchesSearch = !searchQuery || 
      payment.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.banks?.bank_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Date filter
    if (fromDate || toDate) {
      // Extract date in YYYY-MM-DD format, handling both ISO strings and date-only strings
      const paymentDateStr = payment.payment_date.includes('T') 
        ? payment.payment_date.split('T')[0] 
        : payment.payment_date.split(' ')[0];
      
      // Debug log
      if (fromDate === '2024-12-01' && paymentDateStr.startsWith('2024-11')) {
        console.log('Nov date showing:', paymentDateStr, 'fromDate:', fromDate, 'comparison:', paymentDateStr < fromDate);
      }
      
      if (fromDate && paymentDateStr < fromDate) return false;
      if (toDate && paymentDateStr > toDate) return false;
    }
    
    return true;
  }) || [];

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'invoice':
        aVal = a.sales?.invoice_number || '';
        bVal = b.sales?.invoice_number || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'machine':
        aVal = a.machines?.machine_name || '';
        bVal = b.machines?.machine_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'date':
        aVal = new Date(a.payment_date).getTime();
        bVal = new Date(b.payment_date).getTime();
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'amount':
        aVal = Number(a.amount) || 0;
        bVal = Number(b.amount) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'bank':
        aVal = a.banks?.bank_name || '';
        bVal = b.banks?.bank_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        return 0;
    }
  });

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedPayments,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: sortedPayments });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Machine Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage machine-related payments
          </p>
        </div>
        {canEdit && (
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Add New Payment</DialogTitle>
            <PaymentForm
              onSubmit={(data) => {
                createPayment.mutate(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">0</div>
                <div className="text-sm text-muted-foreground">Total Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">৳0</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">0</div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <Building className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">0</div>
                <div className="text-sm text-muted-foreground">Banks Used</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments by machine or bank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <Input
              type="date"
              placeholder="From Date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-secondary/30 border-border w-full md:w-40"
            />
            <Input
              type="date"
              placeholder="To Date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-secondary/30 border-border w-full md:w-40"
            />
            <Button 
              variant="outline" 
              onClick={handleExportExcel}
              className="border-primary text-primary hover:bg-primary/10 whitespace-nowrap"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Payments Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        {/* Desktop Table */}
        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('invoice')}>
                <div className="flex items-center gap-1">
                  Invoice No
                  {sortColumn === 'invoice' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('machine')}>
                <div className="flex items-center gap-1">
                  Machine
                  {sortColumn === 'machine' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Date
                  {sortColumn === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('amount')}>
                <div className="flex items-center gap-1">
                  Amount
                  {sortColumn === 'amount' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('bank')}>
                <div className="flex items-center gap-1">
                  Bank
                  {sortColumn === 'bank' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayments.map((payment: any, index: number) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {getSerialNumber(index)}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm font-medium text-primary">
                      {payment.sales?.invoice_number || (payment.sales ? `CLW/${new Date(payment.sales.sales_date).getFullYear()}/${payment.sales.id.slice(-3).padStart(3, '0')}` : 'N/A')}
                    </div>
                  </TableCell>
                  <TableCell>{payment.machines?.machine_name}</TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell className="text-success font-medium">৳{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>{payment.banks?.bank_name}</TableCell>
                  <TableCell>{payment.remarks || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingPayment(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                      <>
                      <Dialog open={editingPayment?.id === payment.id} onOpenChange={(open) => !open && setEditingPayment(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingPayment(payment)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogTitle className="sr-only">Edit Payment</DialogTitle>
                          <PaymentForm
                            initialData={payment}
                            onSubmit={(data) => {
                              updatePayment.mutate({ id: payment.id, ...data });
                              setEditingPayment(null);
                            }}
                            onCancel={() => setEditingPayment(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletingPayment(payment)}
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
        </div>
        
        {/* Mobile Card View */}
        <div className="md:hidden p-3 space-y-3">
          {paginatedPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payments found
            </div>
          ) : (
            paginatedPayments.map((payment: any) => (
              <Card key={payment.id} className="bg-secondary/5 border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{payment.machines?.machine_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{payment.sales?.invoice_number || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Payment Date</div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-white" />
                        <span className="text-xs">{formatDate(payment.payment_date)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Amount</div>
                      <div className="text-sm font-medium text-success">৳{payment.amount.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Bank</div>
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-primary" />
                        <span className="text-xs">{payment.banks?.bank_name}</span>
                      </div>
                    </div>
                    {payment.remarks && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Remarks</div>
                        <div className="text-xs truncate" title={payment.remarks}>{payment.remarks}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewingPayment(payment)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canEdit && (
                      <>
                        <Dialog open={editingPayment?.id === payment.id} onOpenChange={(open) => !open && setEditingPayment(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingPayment(payment)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogTitle className="sr-only">Edit Payment</DialogTitle>
                            <PaymentForm
                              initialData={payment}
                              onSubmit={(data) => {
                                updatePayment.mutate({ id: payment.id, ...data });
                                setEditingPayment(null);
                              }}
                              onCancel={() => setEditingPayment(null)}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeletingPayment(payment)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Pagination */}
      <TablePager
        totalRows={totalRows}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
      
      {/* View Payment Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewingPayment(null)}>
          <Card className="bg-gradient-card border-border shadow-card max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Machine</div>
                <div className="font-medium">{viewingPayment.machines?.machine_name}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Payment Date</div>
                <div className="font-medium">{formatDate(viewingPayment.payment_date)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="text-lg font-bold text-success">৳{viewingPayment.amount.toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Bank</div>
                <div className="font-medium">{viewingPayment.banks?.bank_name}</div>
              </div>
              {viewingPayment.remarks && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Remarks</div>
                  <div className="font-medium bg-secondary/20 rounded p-2 text-sm">{viewingPayment.remarks}</div>
                </div>
              )}
              {viewingPayment.created_by_user && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Created By</div>
                  <div className="font-medium">{viewingPayment.created_by_user.name || '-'}</div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <Button onClick={() => setViewingPayment(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
        onConfirm={() => deletePayment.mutate(deletingPayment.id)}
        title="Delete Payment"
        description="Are you sure you want to delete this payment?"
        details={[
          { label: "Invoice No", value: deletingPayment?.sales?.invoice_number || 'N/A' },
          { label: "Machine", value: deletingPayment?.machines?.machine_name || '' },
          { label: "Payment Date", value: deletingPayment ? formatDate(deletingPayment.payment_date) : '' },
          { label: "Amount", value: deletingPayment ? `৳${deletingPayment.amount.toLocaleString()}` : '' },
          { label: "Bank", value: deletingPayment?.banks?.bank_name || '' }
        ]}
      />

    </div>
  );
}