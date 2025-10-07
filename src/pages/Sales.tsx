import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Loader2,
  TrendingUp,
  Coins,
  Gift,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Plus,
  Printer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSales, useCreateSale, useDeleteSale, useUpdateSale } from "@/hooks/useSales";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { EditSalesModal } from "@/components/EditSalesModal";
import { SalesForm } from "@/components/forms/SalesForm";
import { InvoicePrint } from "@/components/InvoicePrint";
import { formatDate } from "@/lib/dateUtils";

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [printingSale, setPrintingSale] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: sales, isLoading } = useSales();
  const { data: payments } = useMachinePayments();
  const createSale = useCreateSale();
  const deleteSale = useDeleteSale();
  const updateSale = useUpdateSale();

  // Calculate dynamic payment status
  const getPaymentStatus = (sale: any) => {
    const salePayments = payments?.filter(p => p.invoice_id === sale.id) || [];
    const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payToClowee = Number(sale.pay_to_clowee || 0);
    
    if (totalPaid === 0) return { status: 'Due', totalPaid, balance: payToClowee };
    if (totalPaid >= payToClowee) return { status: totalPaid > payToClowee ? 'Overpaid' : 'Paid', totalPaid, balance: 0 };
    return { status: 'Partial', totalPaid, balance: payToClowee - totalPaid };
  };

  const filteredSales = sales?.filter(sale =>
    sale.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.machines?.machine_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.franchises?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  const totalSalesAmount = sales?.reduce((sum, sale) => sum + sale.sales_amount, 0) || 0;
  const totalPrizeCost = sales?.reduce((sum, sale) => sum + sale.prize_out_cost, 0) || 0;
  const totalCoinSales = sales?.reduce((sum, sale) => sum + sale.coin_sales, 0) || 0;
  const totalPrizeOut = sales?.reduce((sum, sale) => sum + sale.prize_out_quantity, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Sales Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Track coin sales and prize distributions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Add Sales
          </Button>
        </div>
      </div>

      {/* Add Sales Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Add New Sales Record</DialogTitle>
          <SalesForm
            onSubmit={(data) => {
              createSale.mutate(data);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  ৳{totalSalesAmount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Sales</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {totalCoinSales.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Coins</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {totalPrizeOut.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Prizes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  ৳{totalPrizeCost.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Prize Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sales by machine name or franchise..."
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

      {/* Sales Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Franchise</TableHead>
              <TableHead>Sales Date</TableHead>
              <TableHead>Coin Sales</TableHead>
              <TableHead>Sales Amount</TableHead>
              <TableHead>Prize Out</TableHead>
              <TableHead>Prize Cost</TableHead>
              <TableHead>Pay To Clowee</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((sale) => {
              const netRevenue = sale.sales_amount - sale.prize_out_cost;
              const paymentInfo = getPaymentStatus(sale);
              return (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div className="font-mono text-sm font-medium text-primary">
                      {sale.invoice_number || `clw/${new Date(sale.sales_date).getFullYear()}/${sale.id.slice(-3).padStart(3, '0')}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Coins className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{sale.machines?.machine_name || 'Unknown Machine'}</div>
                        <div className="text-sm text-muted-foreground">{sale.machines?.machine_number}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{sale.franchises?.name || 'No Franchise'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(sale.sales_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-primary font-medium">
                    {sale.coin_sales.toLocaleString()} coins
                  </TableCell>
                  <TableCell className="text-success font-medium">
                    ৳{sale.sales_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-accent font-medium">
                    {sale.prize_out_quantity.toLocaleString()} pcs
                  </TableCell>
                  <TableCell className="text-warning font-medium">
                    ৳{sale.prize_out_cost.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-primary font-medium">
                    ৳{(sale.pay_to_clowee || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={
                        paymentInfo.status === 'Paid' 
                          ? 'bg-success text-success-foreground' 
                          : paymentInfo.status === 'Overpaid'
                          ? 'bg-blue-500 text-white'
                          : paymentInfo.status === 'Partial'
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-destructive text-destructive-foreground'
                      }
                    >
                      {paymentInfo.status}
                    </Badge>
                    {paymentInfo.totalPaid > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Paid: ৳{paymentInfo.totalPaid.toLocaleString()}
                      </div>
                    )}
                    {paymentInfo.balance > 0 && (
                      <div className="text-xs text-destructive mt-1">
                        Due: ৳{paymentInfo.balance.toLocaleString()}
                      </div>
                    )}
                    {paymentInfo.status === 'Overpaid' && (
                      <div className="text-xs text-blue-600 mt-1">
                        Overpaid: ৳{(paymentInfo.totalPaid - Number(sale.pay_to_clowee || 0)).toLocaleString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingSale(sale)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPrintingSale(sale)}
                        title="Print Invoice"
                        className="border-primary text-primary hover:bg-primary/10"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingSale(sale)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this sales record?')) {
                            deleteSale.mutate(sale.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSales.length)} of {filteredSales.length} results
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Sales Details Modal */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewingSale(null)}>
          <Card className="bg-gradient-card border-border shadow-card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Sales Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Machine</div>
                  <div className="font-medium">{viewingSale.machines?.machine_name} - {viewingSale.machines?.machine_number}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Franchise</div>
                  <div className="font-medium">{viewingSale.franchises?.name}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Sales Date</div>
                  <div className="font-medium">{formatDate(viewingSale.sales_date)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(viewingSale.created_at)}</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Sales Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Coin Sales</div>
                    <div className="text-lg font-semibold text-primary">{viewingSale.coin_sales.toLocaleString()} coins</div>
                    <div className="text-sm text-success">৳{viewingSale.sales_amount.toLocaleString()}</div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Prize Out</div>
                    <div className="text-lg font-semibold text-accent">{viewingSale.prize_out_quantity.toLocaleString()} pcs</div>
                    <div className="text-sm text-warning">৳{viewingSale.prize_out_cost.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              {/* Calculation Flow */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Calculation Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sales Amount (Gross):</span>
                    <span className="font-medium">৳{viewingSale.sales_amount.toLocaleString()}</span>
                  </div>
                  {viewingSale.vat_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT ({viewingSale.franchises?.vat_percentage || 0}%):</span>
                      <span className="text-destructive">-৳{viewingSale.vat_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Sales (After VAT):</span>
                    <span className="font-medium">৳{(viewingSale.net_sales_amount || (viewingSale.sales_amount - (viewingSale.vat_amount || 0))).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prize Cost (Deducted):</span>
                    <span className="text-destructive">-৳{viewingSale.prize_out_cost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Clowee Profit ({viewingSale.franchises?.clowee_share || 40}%):</span>
                    <span className="font-medium text-success">৳{(viewingSale.clowee_profit || 0).toLocaleString()}</span>
                  </div>
                  {viewingSale.franchises?.electricity_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Electricity Cost:</span>
                      <span className="text-destructive">-৳{viewingSale.franchises.electricity_cost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span className="text-primary">Pay To Clowee:</span>
                    <span className="text-primary text-lg">৳{(viewingSale.pay_to_clowee || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {(viewingSale.vat_amount > 0 || viewingSale.franchises?.electricity_cost > 0) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Additional Charges</h4>
                  <div className="space-y-2">
                    {viewingSale.vat_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT ({viewingSale.franchises?.vat_percentage || 0}%):</span>
                        <span className="text-destructive">৳{viewingSale.vat_amount.toLocaleString()}</span>
                      </div>
                    )}
                    {viewingSale.franchises?.electricity_cost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Electricity Cost:</span>
                        <span className="text-warning">৳{viewingSale.franchises.electricity_cost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {(viewingSale.coin_adjustment || viewingSale.prize_adjustment || viewingSale.adjustment_notes) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Adjustments</h4>
                  <div className="space-y-2">
                    {viewingSale.coin_adjustment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coin Adjustment:</span>
                        <span className="text-destructive">-{viewingSale.coin_adjustment} coins</span>
                      </div>
                    )}
                    {viewingSale.prize_adjustment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prize Adjustment:</span>
                        <span className="text-destructive">-{viewingSale.prize_adjustment} pcs</span>
                      </div>
                    )}
                    {viewingSale.adjustment_notes && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Notes:</div>
                        <div className="text-sm bg-secondary/20 rounded p-2">{viewingSale.adjustment_notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Revenue:</span>
                  <span className={`text-lg font-bold ${(viewingSale.sales_amount - viewingSale.prize_out_cost) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ৳{(viewingSale.sales_amount - viewingSale.prize_out_cost).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={() => setViewingSale(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Edit Sales Modal */}
      {editingSale && (
        <EditSalesModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onUpdate={(data) => {
            updateSale.mutate({ id: editingSale.id, ...data });
            setEditingSale(null);
          }}
        />
      )}
      
      {/* Print Invoice Modal */}
      {printingSale && (
        <InvoicePrint
          sale={printingSale}
          onClose={() => setPrintingSale(null)}
        />
      )}
    </div>
  );
}