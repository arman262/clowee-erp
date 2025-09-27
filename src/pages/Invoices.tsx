import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  DollarSign,
  Calendar,
  Loader2
} from "lucide-react";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useDeleteInvoice } from "@/hooks/useInvoices";
import { InvoiceForm } from "@/components/forms/InvoiceForm";
import { Tables } from "@/integrations/supabase/types";

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Tables<'invoices'> | null>(null);

  const { data: invoices, isLoading } = useInvoices();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const filteredInvoices = invoices?.filter(invoice =>
    invoice.franchises?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.machines?.machine_number?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-success text-success-foreground';
      case 'Pending':
        return 'bg-warning text-warning-foreground';
      case 'Draft':
        return 'bg-secondary text-secondary-foreground';
      case 'Overdue':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Invoice Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage franchise invoices
          </p>
        </div>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <InvoiceForm
              onSubmit={(data) => {
                createInvoice.mutate(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices by franchise, machine, or invoice number..."
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

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-neon">
                    <FileText className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">
                      Invoice #{invoice.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {invoice.franchises?.name} • {invoice.machines?.machine_name}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(invoice.status || 'Draft')}>
                  {invoice.status || 'Draft'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Financial Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Total Sales</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    ৳{invoice.total_sales.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Net Profit</span>
                  </div>
                  <p className="text-lg font-semibold text-accent">
                    ৳{invoice.net_profit.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Share Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Franchise Share:</span>
                  <span className="text-foreground">৳{invoice.franchise_share_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clowee Share:</span>
                  <span className="text-foreground">৳{invoice.clowee_share_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay to Clowee:</span>
                  <span className="text-warning font-semibold">৳{invoice.pay_to_clowee.toLocaleString()}</span>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Invoice Date:</span>
                </div>
                <span className="text-foreground">
                  {new Date(invoice.invoice_date).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 border-border hover:bg-secondary/50">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Dialog open={editingInvoice?.id === invoice.id} onOpenChange={(open) => !open && setEditingInvoice(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-border hover:bg-secondary/50"
                      onClick={() => setEditingInvoice(invoice)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <InvoiceForm
                      initialData={invoice}
                      onSubmit={(data) => {
                        updateInvoice.mutate({ id: invoice.id, ...data });
                        setEditingInvoice(null);
                      }}
                      onCancel={() => setEditingInvoice(null)}
                    />
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="border-border hover:bg-secondary/50">
                  <Download className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this invoice?')) {
                      deleteInvoice.mutate(invoice.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {invoices?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Invoices</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {invoices?.filter(i => i.status === 'Paid').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              {invoices?.filter(i => i.status === 'Pending').length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              ৳{invoices?.reduce((sum, i) => sum + i.total_sales, 0).toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              ৳{invoices?.reduce((sum, i) => sum + i.net_profit, 0).toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Profit</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}