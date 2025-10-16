import { useState } from "react";
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
  Building
} from "lucide-react";
import { PaymentForm } from "@/components/forms/PaymentForm";
import { useMachinePayments, useCreateMachinePayment, useUpdateMachinePayment, useDeleteMachinePayment } from "@/hooks/useMachinePayments";
import { TablePager } from "@/components/TablePager";
import { usePagination } from "@/hooks/usePagination";
import { formatDate } from "@/lib/dateUtils";

export default function Payments() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingPayment, setViewingPayment] = useState<any | null>(null);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);

  const { data: payments, isLoading } = useMachinePayments();
  const createPayment = useCreateMachinePayment();
  const updatePayment = useUpdateMachinePayment();
  const deletePayment = useDeleteMachinePayment();

  const filteredPayments = payments?.filter((payment: any) =>
    payment.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payment.banks?.bank_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedPayments,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: filteredPayments });

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments by machine or bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border"
            />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank</TableHead>
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
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this payment?')) {
                            deletePayment.mutate(payment.id);
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
              <div className="flex justify-end pt-4">
                <Button onClick={() => setViewingPayment(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      

    </div>
  );
}