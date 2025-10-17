import { EditSalesModal } from "@/components/EditSalesModal";
import { InvoicePrint } from "@/components/InvoicePrint";
import { PayToCloweeModal } from "@/components/PayToCloweeModal";
import { TablePager } from "@/components/TablePager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFranchiseAgreements } from "@/hooks/useFranchiseAgreements";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { usePermissions } from "@/hooks/usePermissions";
import { useCreateSale, useDeleteSale, useSales, useUpdateSale } from "@/hooks/useSales";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency, formatNumber } from "@/lib/numberUtils";
import {
  Calendar,
  Coins,
  Edit,
  Eye,
  FileText,
  Gift,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingUp
} from "lucide-react";
import { useState } from "react";

export default function Sales() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showPayToClowee, setShowPayToClowee] = useState(false);
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
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

  // Calculate Pay To Clowee for a sale (without fetching agreements for performance)
  const calculatePayToClowee = (sale: any) => {
    const coinPrice = sale.franchises?.coin_price || 0;
    const dollPrice = sale.franchises?.doll_price || 0;
    const vatPercentage = sale.franchises?.vat_percentage || 0;
    const cloweeShare = sale.franchises?.clowee_share || 40;
    const maintenancePercentage = sale.franchises?.maintenance_percentage || 0;
    const electricityCost = sale.franchises?.electricity_cost || 0;
    const amountAdjustment = sale.amount_adjustment || 0;
    
    const calculatedSalesAmount = (sale.coin_sales || 0) * coinPrice;
    const calculatedPrizeCost = (sale.prize_out_quantity || 0) * dollPrice;
    const calculatedVatAmount = calculatedSalesAmount * vatPercentage / 100;
    const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
    const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
    const profitAfterMaintenance = netProfit - maintenanceAmount;
    const calculatedCloweeProfit = (profitAfterMaintenance * cloweeShare) / 100;
    
    return calculatedCloweeProfit + calculatedPrizeCost + maintenanceAmount - electricityCost - amountAdjustment;
  };

  // Calculate dynamic payment status
  const getPaymentStatus = (sale: any) => {
    const salePayments = payments?.filter(p => p.invoice_id === sale.id) || [];
    const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payToClowee = calculatePayToClowee(sale);
    
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
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Sales Data
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track coin sales and prize distributions
          </p>
        </div>
        {canEdit && (
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setShowPayToClowee(true)} className="bg-gradient-primary hover:opacity-90 flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Pay to Clowee</span>
            <span className="sm:hidden">Pay</span>
          </Button>
        </div>
        )}
      </div>

      {/* Pay to Clowee Modal */}
      <PayToCloweeModal
        open={showPayToClowee}
        onOpenChange={setShowPayToClowee}
      />

      {/* Sales Summary */}
      <Card className="bg-gradient-glass border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold break-words">
            Sales Summary - {(fromDate || toDate) ? (fromDate === toDate ? formatDate(fromDate) : `${formatDate(fromDate)} to ${formatDate(toDate)}`) : 'All Sales'} ({summaryData.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-bold text-success truncate">
                  ৳{formatCurrency(dateRangeStats.totalSalesAmount)}
                </div>
                <div className="text-sm text-muted-foreground">Total Sales</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-primary truncate">
                  {formatNumber(dateRangeStats.totalCoinSales)}
                </div>
                <div className="text-sm text-muted-foreground">Total Coins</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary-white" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-accent truncate">
                  {formatNumber(dateRangeStats.totalPrizeOut)}
                </div>
                <div className="text-sm text-muted-foreground">Total Prizes</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-white" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-warning truncate">
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">From:</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="flex-1 sm:w-40 bg-secondary/30 border-border text-xs sm:text-sm"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">To:</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="flex-1 sm:w-40 bg-secondary/30 border-border text-xs sm:text-sm"
                />
              </div>
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
      <Card className="bg-gradient-card border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead>Sales Date</TableHead>
              <TableHead>Coin Sales</TableHead>
              <TableHead>Sales Amount</TableHead>
              <TableHead>Prize Out</TableHead>
              <TableHead>Prize Cost</TableHead>
              <TableHead>Pay To Clowee</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead className="sticky right-0 bg-card">Actions</TableHead>
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
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Coins className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <div className="min-w-0 max-w-[120px]">
                        <div className="font-medium text-xs sm:text-sm break-words">{sale.machines?.machine_name || 'Unknown Machine'}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{sale.machines?.machine_number}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-white flex-shrink-0" />
                      <span className="text-xs sm:text-sm whitespace-nowrap">{formatDate(sale.sales_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-primary font-medium text-xs sm:text-sm whitespace-nowrap">
                    {formatNumber(sale.coin_sales)}
                  </TableCell>
                  <TableCell className="text-success font-medium text-xs sm:text-sm whitespace-nowrap">
                    ৳{formatCurrency(sale.sales_amount)}
                  </TableCell>
                  <TableCell className="text-accent font-medium text-xs sm:text-sm whitespace-nowrap">
                    {formatNumber(sale.prize_out_quantity)}
                  </TableCell>
                  <TableCell className="text-warning font-medium text-xs sm:text-sm whitespace-nowrap">
                    ৳{formatCurrency(sale.prize_out_cost)}
                  </TableCell>
                  <TableCell className="text-primary font-medium text-xs sm:text-sm whitespace-nowrap">
                    ৳{formatCurrency(calculatePayToClowee(sale))}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`text-xs whitespace-nowrap ${
                        paymentInfo.status === 'Paid' 
                          ? 'bg-success text-success-foreground' 
                          : paymentInfo.status === 'Overpaid'
                          ? 'bg-blue-500 text-white'
                          : paymentInfo.status === 'Partial'
                          ? 'bg-warning text-warning-foreground'
                          : 'bg-destructive text-destructive-foreground'
                      }`}
                    >
                      {paymentInfo.status}
                    </Badge>
                    {paymentInfo.totalPaid > 0 && (
                      <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 whitespace-nowrap">
                        Paid: ৳{formatCurrency(paymentInfo.totalPaid)}
                      </div>
                    )}
                    {paymentInfo.balance > 0 && (
                      <div className="text-[10px] sm:text-xs text-destructive mt-1 whitespace-nowrap">
                        Due: ৳{formatCurrency(paymentInfo.balance)}
                      </div>
                    )}
                    {paymentInfo.status === 'Overpaid' && (
                      <div className="text-[10px] sm:text-xs text-blue-600 mt-1 whitespace-nowrap">
                        Overpaid: ৳{formatCurrency(paymentInfo.totalPaid - calculatePayToClowee(sale))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-card">
                    <div className="flex gap-1 flex-nowrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingSale(sale)}
                        title="View Details"
                        className="p-1 sm:p-2 h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingInvoice(sale)}
                        title="View Invoice"
                        className="border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 p-1 sm:p-2 h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      {canEdit && (
                      <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingSale(sale)}
                        title="Edit"
                        className="p-1 sm:p-2 h-7 w-7 sm:h-8 sm:w-8"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10 p-1 sm:p-2 h-7 w-7 sm:h-8 sm:w-8"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this sales record?')) {
                            deleteSale.mutate(sale.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
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
      
      {/* View Invoice Modal */}
      {viewingInvoice && (
        <InvoicePrint
          sale={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
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
                <div className="text-sm text-success">৳{formatCurrency((sale.coin_sales || 0) * (getAgreementValueForSale(sale, 'coin_price', agreements) || 0))}</div>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="text-sm text-muted-foreground mb-1">Prize Out</div>
                <div className="text-lg font-semibold text-accent">{sale.prize_out_quantity.toLocaleString()} pcs</div>
                <div className="text-sm text-warning">৳{formatCurrency((sale.prize_out_quantity || 0) * (getAgreementValueForSale(sale, 'doll_price', agreements) || 0))}</div>
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
                      <span className="font-medium">৳{formatCurrency(calculatedSalesAmount)}</span>
                    </div>
                    {calculatedVatAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">VAT ({vatPercentage}%):</span>
                        <span className="text-destructive">-৳{formatCurrency(calculatedVatAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Net Sales (After VAT):</span>
                      <span className="font-medium">৳{formatCurrency(calculatedNetSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prize Cost (Deducted):</span>
                      <span className="text-destructive">-৳{formatCurrency(calculatedPrizeCost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Franchise Profit ({getAgreementValueForSale(sale, 'franchise_share', agreements) || 60}%):</span>
                      <span className="font-medium text-success">৳{(() => {
                        const franchiseShare = getAgreementValueForSale(sale, 'franchise_share', agreements) || 60;
                        const maintenancePercentage = getAgreementValueForSale(sale, 'maintenance_percentage', agreements) || 0;
                        const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
                        const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
                        const profitAfterMaintenance = netProfit - maintenanceAmount;
                        const franchiseProfit = profitAfterMaintenance * franchiseShare / 100;
                        return formatCurrency(franchiseProfit);
                      })()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clowee Profit ({getAgreementValueForSale(sale, 'clowee_share', agreements) || 40}%):</span>
                      <span className="font-medium text-success">৳{(() => {
                        const cloweeShare = getAgreementValueForSale(sale, 'clowee_share', agreements) || 40;
                        const maintenancePercentage = getAgreementValueForSale(sale, 'maintenance_percentage', agreements) || 0;
                        const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
                        const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
                        const profitAfterMaintenance = netProfit - maintenanceAmount;
                        const cloweeProfit = profitAfterMaintenance * cloweeShare / 100;
                        return formatCurrency(cloweeProfit);
                      })()}</span>
                    </div>
                    {electricityCost > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Electricity Cost:</span>
                        <span className="text-destructive">-৳{formatCurrency(electricityCost)}</span>
                      </div>
                    )}
                    {(() => {
                      const maintenancePercentage = getAgreementValueForSale(sale, 'maintenance_percentage', agreements) || 0;
                      const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
                      const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
                      
                      return maintenanceAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Maintenance ({maintenancePercentage}%):</span>
                          <span className="font-medium">৳{formatCurrency(maintenanceAmount)}</span>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span className="text-primary">Pay To Clowee:</span>
                      <span className="text-primary text-lg">৳{(() => {
                        const maintenancePercentage = getAgreementValueForSale(sale, 'maintenance_percentage', agreements) || 0;
                        const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
                        const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
                        const electricityCost = getAgreementValueForSale(sale, 'electricity_cost', agreements) || 0;
                        const cloweeShare = getAgreementValueForSale(sale, 'clowee_share', agreements) || 40;
                        const profitAfterMaintenance = netProfit - maintenanceAmount;
                        const cloweeProfit = profitAfterMaintenance * cloweeShare / 100;
                        const payToClowee = cloweeProfit + calculatedPrizeCost + maintenanceAmount - electricityCost;
                        return formatCurrency(payToClowee);
                      })()}</span>
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
                      <span className="text-destructive">৳{formatCurrency(calculatedVatAmount)}</span>
                    </div>
                  )}
                  {electricityCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Electricity Cost:</span>
                      <span className="text-warning">৳{formatCurrency(electricityCost)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          
          {(sale.coin_adjustment || sale.prize_adjustment || sale.amount_adjustment || sale.adjustment_notes) && (
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
                {sale.amount_adjustment > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Adjustment:</span>
                    <span className="text-destructive">-৳{formatCurrency(sale.amount_adjustment)}</span>
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