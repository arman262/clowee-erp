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
import { useFranchiseAgreements } from "@/hooks/useFranchiseAgreements";
import { EditSalesModal } from "@/components/EditSalesModal";
import { SalesForm } from "@/components/forms/SalesForm";
import { InvoicePrint } from "@/components/InvoicePrint";
import { PayToCloweeModal } from "@/components/PayToCloweeModal";
import { TablePager } from "@/components/TablePager";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency, formatNumber } from "@/lib/numberUtils";

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPayToClowee, setShowPayToClowee] = useState(false);
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [printingSale, setPrintingSale] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const { data: sales, isLoading } = useSales();
  const { data: payments } = useMachinePayments();
  // We'll fetch agreements per sale in the function below

  // Get agreement values for a specific sale (matching InvoicePrint logic)
  const getAgreementValueForSale = (sale: any, field: string, agreements?: any[]) => {
    if (!agreements || agreements.length === 0) {
      return sale.franchises?.[field];
    }
    
    const latestAgreement = agreements
      .filter(a => new Date(a.effective_date) <= new Date(sale.sales_date))
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
    
    if (latestAgreement) {
      return latestAgreement[field];
    }
    return sale.franchises?.[field];
  };
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

  const filteredSales = sales?.filter(sale => {
    const matchesSearch = sale.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.machines?.machine_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.franchises?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply date filter if any date is selected
    if (fromDate || toDate) {
      if (!sale.sales_date) return false;
      try {
        const saleDate = new Date(sale.sales_date).toISOString().split('T')[0];
        let matchesDateRange = true;
        
        if (fromDate && toDate) {
          matchesDateRange = saleDate >= fromDate && saleDate <= toDate;
        } else if (fromDate) {
          matchesDateRange = saleDate >= fromDate;
        } else if (toDate) {
          matchesDateRange = saleDate <= toDate;
        }
        
        return matchesSearch && matchesDateRange;
      } catch (error) {
        return false;
      }
    }
    
    return matchesSearch;
  }) || [];

  // Summary calculations - use all sales when no date filter, filtered sales when date filter applied
  const summaryData = (fromDate || toDate) ? filteredSales : (sales || []);
  
  const dateRangeStats = {
    totalSales: summaryData.length,
    totalSalesAmount: summaryData.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0),
    totalCoinSales: summaryData.reduce((sum, sale) => sum + (sale.coin_sales || 0), 0),
    totalPrizeOut: summaryData.reduce((sum, sale) => sum + (sale.prize_out_quantity || 0), 0),
    totalPrizeCost: summaryData.reduce((sum, sale) => sum + Number(sale.prize_out_cost || 0), 0),
    totalPayToClowee: summaryData.reduce((sum, sale) => sum + Number(sale.pay_to_clowee || 0), 0)
  };

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + rowsPerPage);



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
          <Button onClick={() => setShowPayToClowee(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Pay to Clowee
          </Button>
        </div>
      </div>

      {/* Pay to Clowee Modal */}
      <PayToCloweeModal
        open={showPayToClowee}
        onOpenChange={setShowPayToClowee}
      />

      {/* Sales Summary */}
      <Card className="bg-gradient-glass border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Sales Summary - {(fromDate || toDate) ? (fromDate === toDate ? formatDate(fromDate) : `${formatDate(fromDate)} to ${formatDate(toDate)}`) : 'All Sales'} ({summaryData.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  ৳{formatCurrency(dateRangeStats.totalSalesAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Total Sales</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {formatNumber(dateRangeStats.totalCoinSales)}
                </div>
                <div className="text-sm text-muted-foreground">Total Coins</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {formatNumber(dateRangeStats.totalPrizeOut)}
                </div>
                <div className="text-sm text-muted-foreground">Total Prizes</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  ৳{formatCurrency(dateRangeStats.totalPayToClowee)}
                </div>
                <div className="text-sm text-muted-foreground">Pay To Clowee</div>
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
                placeholder="Search sales by machine name or franchise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40 bg-secondary/30 border-border"
              />
              <span className="text-sm text-muted-foreground">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
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
                      {sale.invoice_number || 'Pending'}
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
                    {formatNumber(sale.coin_sales)} coins
                  </TableCell>
                  <TableCell className="text-success font-medium">
                    ৳{formatCurrency(sale.sales_amount)}
                  </TableCell>
                  <TableCell className="text-accent font-medium">
                    {formatNumber(sale.prize_out_quantity)} pcs
                  </TableCell>
                  <TableCell className="text-warning font-medium">
                    ৳{formatCurrency(sale.prize_out_cost)}
                  </TableCell>
                  <TableCell className="text-primary font-medium">
                    ৳{formatCurrency(sale.pay_to_clowee || 0)}
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
                        Paid: ৳{formatCurrency(paymentInfo.totalPaid)}
                      </div>
                    )}
                    {paymentInfo.balance > 0 && (
                      <div className="text-xs text-destructive mt-1">
                        Due: ৳{formatCurrency(paymentInfo.balance)}
                      </div>
                    )}
                    {paymentInfo.status === 'Overpaid' && (
                      <div className="text-xs text-blue-600 mt-1">
                        Overpaid: ৳{formatCurrency(paymentInfo.totalPaid - Number(sale.pay_to_clowee || 0))}
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
                        className="border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg"
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
      <TablePager
        totalRows={filteredSales.length}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onRowsPerPageChange={setRowsPerPage}
      />
      
      {/* Sales Details Modal */}
      {viewingSale && (
        <SalesDetailsModal 
          sale={viewingSale} 
          onClose={() => setViewingSale(null)}
          getAgreementValueForSale={getAgreementValueForSale}
        />
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

// Separate component for Sales Details Modal to use franchise-specific agreements
function SalesDetailsModal({ sale, onClose, getAgreementValueForSale }: { 
  sale: any; 
  onClose: () => void;
  getAgreementValueForSale: (sale: any, field: string, agreements?: any[]) => any;
}) {
  const { data: agreements } = useFranchiseAgreements(sale.franchise_id);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
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
              <div className="font-medium">{sale.machines?.machine_name} - {sale.machines?.machine_number}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Franchise</div>
              <div className="font-medium">{sale.franchises?.name}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Sales Date</div>
              <div className="font-medium">{formatDate(sale.sales_date)}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="font-medium">{formatDate(sale.created_at)}</div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Sales Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Coin Sales</div>
                <div className="text-lg font-semibold text-primary">{sale.coin_sales.toLocaleString()} coins</div>
                <div className="text-sm text-success">৳{((sale.coin_sales || 0) * (getAgreementValueForSale(sale, 'coin_price', agreements) || 0)).toLocaleString()}</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Prize Out</div>
                <div className="text-lg font-semibold text-accent">{sale.prize_out_quantity.toLocaleString()} pcs</div>
                <div className="text-sm text-warning">৳{((sale.prize_out_quantity || 0) * (getAgreementValueForSale(sale, 'doll_price', agreements) || 0)).toLocaleString()}</div>
              </div>
            </div>
          </div>
          
          {/* Calculation Flow */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Calculation Breakdown</h4>
            <div className="space-y-2 text-sm">
              {(() => {
                // Calculate values using agreement rates (matching InvoicePrint logic)
                const coinPrice = getAgreementValueForSale(sale, 'coin_price', agreements) || 0;
                const dollPrice = getAgreementValueForSale(sale, 'doll_price', agreements) || 0;
                const vatPercentage = getAgreementValueForSale(sale, 'vat_percentage', agreements) || 0;
                const electricityCost = getAgreementValueForSale(sale, 'electricity_cost', agreements) || 0;
                
                const calculatedSalesAmount = (sale.coin_sales || 0) * coinPrice;
                const calculatedPrizeCost = (sale.prize_out_quantity || 0) * dollPrice;
                const calculatedVatAmount = calculatedSalesAmount * vatPercentage / 100;
                const calculatedNetSales = calculatedSalesAmount - calculatedVatAmount;
                
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales Amount (Gross):</span>
                      <span className="font-medium">৳{calculatedSalesAmount.toLocaleString()}</span>
                    </div>
                    {calculatedVatAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT ({vatPercentage}%):</span>
                        <span className="text-destructive">-৳{calculatedVatAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Sales (After VAT):</span>
                      <span className="font-medium">৳{calculatedNetSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prize Cost (Deducted):</span>
                      <span className="text-destructive">-৳{calculatedPrizeCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Clowee Profit ({getAgreementValueForSale(sale, 'clowee_share', agreements) || 40}%):</span>
                      <span className="font-medium text-success">৳{(sale.clowee_profit || 0).toLocaleString()}</span>
                    </div>
                    {electricityCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Electricity Cost:</span>
                        <span className="text-destructive">-৳{electricityCost.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span className="text-primary">Pay To Clowee:</span>
                      <span className="text-primary text-lg">৳{(sale.pay_to_clowee || 0).toLocaleString()}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          
          {(() => {
            const vatPercentage = getAgreementValueForSale(sale, 'vat_percentage', agreements) || 0;
            const electricityCost = getAgreementValueForSale(sale, 'electricity_cost', agreements) || 0;
            const coinPrice = getAgreementValueForSale(sale, 'coin_price', agreements) || 0;
            const calculatedSalesAmount = (sale.coin_sales || 0) * coinPrice;
            const calculatedVatAmount = calculatedSalesAmount * vatPercentage / 100;
            
            return (calculatedVatAmount > 0 || electricityCost > 0) && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Additional Charges</h4>
                <div className="space-y-2">
                  {calculatedVatAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">VAT ({vatPercentage}%):</span>
                      <span className="text-destructive">৳{calculatedVatAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {electricityCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Electricity Cost:</span>
                      <span className="text-warning">৳{electricityCost.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
          {(sale.coin_adjustment || sale.prize_adjustment || sale.adjustment_notes) && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Adjustments</h4>
              <div className="space-y-2">
                {sale.coin_adjustment && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coin Adjustment:</span>
                    <span className="text-destructive">-{sale.coin_adjustment} coins</span>
                  </div>
                )}
                {sale.prize_adjustment && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prize Adjustment:</span>
                    <span className="text-destructive">-{sale.prize_adjustment} pcs</span>
                  </div>
                )}
                {sale.adjustment_notes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Notes:</div>
                    <div className="text-sm bg-secondary/20 rounded p-2">{sale.adjustment_notes}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Net Revenue:</span>
              <span className={`text-lg font-bold ${(sale.sales_amount - sale.prize_out_cost) >= 0 ? 'text-success' : 'text-destructive'}`}>
                ৳{(sale.sales_amount - sale.prize_out_cost).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}