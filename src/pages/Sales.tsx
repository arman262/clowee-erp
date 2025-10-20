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
  Download,
  Edit,
  Eye,
  FileText,
  Gift,
  Loader2,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useState } from "react";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
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

  const sortedSales = [...filteredSales].sort((a, b) => {
    if (!sortColumn) return 0;
    
    let aVal: any, bVal: any;
    
    switch (sortColumn) {
      case 'invoice':
        aVal = a.invoice_number || '';
        bVal = b.invoice_number || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'machine':
        aVal = a.machines?.machine_name || '';
        bVal = b.machines?.machine_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'date':
        aVal = new Date(a.sales_date).getTime();
        bVal = new Date(b.sales_date).getTime();
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'coinSales':
        aVal = a.coin_sales || 0;
        bVal = b.coin_sales || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'salesAmount':
        aVal = Number(a.sales_amount) || 0;
        bVal = Number(b.sales_amount) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'prizeOut':
        aVal = a.prize_out_quantity || 0;
        bVal = b.prize_out_quantity || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'prizeCost':
        aVal = Number(a.prize_out_cost) || 0;
        bVal = Number(b.prize_out_cost) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'payToClowee':
        aVal = calculatePayToClowee(a);
        bVal = calculatePayToClowee(b);
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'paymentStatus':
        aVal = getPaymentStatus(a).status;
        bVal = getPaymentStatus(b).status;
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        return 0;
    }
  });

  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedSales = sortedSales.slice(startIndex, startIndex + rowsPerPage);

  const handleExportExcel = () => {
    const exportData = sortedSales.map(sale => {
      const paymentInfo = getPaymentStatus(sale);
      return {
        'Invoice No': sale.invoice_number || 'Pending',
        'Machine Name': sale.machines?.machine_name || 'Unknown',
        'Machine Number': sale.machines?.machine_number || '',
        'Franchise': sale.franchises?.name || '',
        'Sales Date': formatDate(sale.sales_date),
        'Coin Sales': sale.coin_sales || 0,
        'Sales Amount': Number(sale.sales_amount || 0).toFixed(2),
        'Prize Out': sale.prize_out_quantity || 0,
        'Prize Cost': Number(sale.prize_out_cost || 0).toFixed(2),
        'VAT Amount': Number(sale.vat_amount || 0).toFixed(2),
        'Net Sales': Number(sale.net_sales_amount || 0).toFixed(2),
        'Clowee Profit': Number(sale.clowee_profit || 0).toFixed(2),
        'Pay To Clowee': Number(calculatePayToClowee(sale)).toFixed(2),
        'Payment Status': paymentInfo.status,
        'Amount Paid': Number(paymentInfo.totalPaid).toFixed(2),
        'Balance Due': Number(paymentInfo.balance).toFixed(2)
      };
    });

    // Add total summary row
    const dateRange = fromDate && toDate ? `${formatDate(fromDate)} → ${formatDate(toDate)}` : fromDate ? `From ${formatDate(fromDate)}` : toDate ? `To ${formatDate(toDate)}` : 'All Dates';
    const totalDue = filteredSales.filter(sale => getPaymentStatus(sale).status === 'Due').length;
    exportData.push({
      'Invoice No': 'TOTAL',
      'Machine Name': '',
      'Machine Number': '',
      'Franchise': '',
      'Sales Date': dateRange,
      'Coin Sales': filteredSales.reduce((sum, sale) => sum + (sale.coin_sales || 0), 0),
      'Sales Amount': filteredSales.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0).toFixed(2),
      'Prize Out': filteredSales.reduce((sum, sale) => sum + (sale.prize_out_quantity || 0), 0),
      'Prize Cost': filteredSales.reduce((sum, sale) => sum + Number(sale.prize_out_cost || 0), 0).toFixed(2),
      'VAT Amount': '',
      'Net Sales': '',
      'Clowee Profit': '',
      'Pay To Clowee': filteredSales.reduce((sum, sale) => sum + calculatePayToClowee(sale), 0).toFixed(2),
      'Payment Status': `${totalDue} Due`,
      'Amount Paid': '',
      'Balance Due': ''
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
    const filename = `Sales_Report_${dateStr}_${timeStr}.xlsx`;
    
    XLSX.writeFile(wb, filename);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    doc.setFontSize(16);
    doc.text('Sales Report', 14, 15);
    
    const now = new Date();
    doc.setFontSize(9);
    doc.text(`Generated: ${now.toLocaleString('en-GB')}`, 14, 22);
    
    const tableData = sortedSales.map(sale => {
      const paymentInfo = getPaymentStatus(sale);
      return [
        sale.invoice_number || 'Pending',
        sale.machines?.machine_name || 'Unknown',
        formatDate(sale.sales_date),
        sale.coin_sales || 0,
        formatCurrency(sale.sales_amount),
        formatCurrency(calculatePayToClowee(sale)),
        paymentInfo.status
      ];
    });

    // Add total summary row
    const dateRange = fromDate && toDate ? `${formatDate(fromDate)} → ${formatDate(toDate)}` : fromDate ? `From ${formatDate(fromDate)}` : toDate ? `To ${formatDate(toDate)}` : 'All Dates';
    const totalDue = filteredSales.filter(sale => getPaymentStatus(sale).status === 'Due').length;
    tableData.push([
      'TOTAL',
      '',
      dateRange,
      filteredSales.reduce((sum, sale) => sum + (sale.coin_sales || 0), 0),
      formatCurrency(filteredSales.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0)),
      formatCurrency(filteredSales.reduce((sum, sale) => sum + calculatePayToClowee(sale), 0)),
      `${totalDue} Due`
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Invoice', 'Machine', 'Date', 'Coins', 'Sales', 'Pay To Clowee', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 35 },
        2: { cellWidth: 22 },
        3: { cellWidth: 18 },
        4: { cellWidth: 25 },
        5: { cellWidth: 30 },
        6: { cellWidth: 20 }
      },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [59, 130, 246, 0.1];
        }
      }
    });
    
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '');
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', '');
    const filename = `Sales_Report_${dateStr}_${timeStr}.pdf`;
    
    doc.save(filename);
  };



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
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-36 bg-secondary/30 border-border text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-36 bg-secondary/30 border-border text-sm"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleExportExcel}
                className="border-success text-success hover:bg-success/10 whitespace-nowrap"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportPDF}
                className="border-success text-success hover:bg-success/10 whitespace-nowrap"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
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

      {/* Sales Table - Desktop */}
      <Card className="bg-gradient-card border-border shadow-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
                  Sales Date
                  {sortColumn === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('coinSales')}>
                <div className="flex items-center gap-1">
                  Coin Sales
                  {sortColumn === 'coinSales' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('salesAmount')}>
                <div className="flex items-center gap-1">
                  Sales Amount
                  {sortColumn === 'salesAmount' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('prizeOut')}>
                <div className="flex items-center gap-1">
                  Prize Out
                  {sortColumn === 'prizeOut' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('prizeCost')}>
                <div className="flex items-center gap-1">
                  Prize Cost
                  {sortColumn === 'prizeCost' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('payToClowee')}>
                <div className="flex items-center gap-1">
                  Pay To Clowee
                  {sortColumn === 'payToClowee' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('paymentStatus')}>
                <div className="flex items-center gap-1">
                  Payment Status
                  {sortColumn === 'paymentStatus' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="sticky right-0 bg-card">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((sale) => {
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
                      <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                        <Coins className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 max-w-[120px]">
                        <div className="font-medium text-sm break-words">{sale.machines?.machine_name || 'Unknown Machine'}</div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{sale.machines?.machine_number}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-white flex-shrink-0" />
                      <span className="text-sm whitespace-nowrap">{formatDate(sale.sales_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-primary font-medium text-sm whitespace-nowrap">
                    {formatNumber(sale.coin_sales)}
                  </TableCell>
                  <TableCell className="text-success font-medium text-sm whitespace-nowrap">
                    ৳{formatCurrency(sale.sales_amount)}
                  </TableCell>
                  <TableCell className="text-accent font-medium text-sm">
                    <div>{formatNumber(sale.prize_out_quantity)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Ratio: {sale.prize_out_quantity > 0 ? ((sale.coin_sales || 0) / sale.prize_out_quantity).toFixed(2) : '0.00'}
                    </div>
                  </TableCell>
                  <TableCell className="text-warning font-medium text-sm whitespace-nowrap">
                    ৳{formatCurrency(sale.prize_out_cost)}
                  </TableCell>
                  <TableCell className="text-primary font-medium text-sm whitespace-nowrap">
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
                      <div className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                        Paid: ৳{formatCurrency(paymentInfo.totalPaid)}
                      </div>
                    )}
                    {paymentInfo.balance > 0 && (
                      <div className="text-xs text-destructive mt-1 whitespace-nowrap">
                        Due: ৳{formatCurrency(paymentInfo.balance)}
                      </div>
                    )}
                    {paymentInfo.status === 'Overpaid' && (
                      <div className="text-xs text-blue-600 mt-1 whitespace-nowrap">
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
                        className="p-2 h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingInvoice(sale)}
                        title="View Invoice"
                        className="border-2 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100 p-2 h-8 w-8"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                      <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingSale(sale)}
                        title="Edit"
                        className="p-2 h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10 p-2 h-8 w-8"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this sales record?')) {
                            deleteSale.mutate(sale.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Total Summary Row */}
            <TableRow className="bg-primary/10 font-bold border-t-2 border-primary">
              <TableCell colSpan={2} className="text-primary">
                TOTAL
              </TableCell>
              <TableCell className="text-sm">
                {fromDate && toDate ? `${formatDate(fromDate)} → ${formatDate(toDate)}` : fromDate ? `From ${formatDate(fromDate)}` : toDate ? `To ${formatDate(toDate)}` : 'All Dates'}
              </TableCell>
              <TableCell className="text-primary">
                {formatNumber(filteredSales.reduce((sum, sale) => sum + (sale.coin_sales || 0), 0))}
              </TableCell>
              <TableCell className="text-success">
                ৳{formatCurrency(filteredSales.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0))}
              </TableCell>
              <TableCell className="text-accent">
                {formatNumber(filteredSales.reduce((sum, sale) => sum + (sale.prize_out_quantity || 0), 0))}
              </TableCell>
              <TableCell className="text-warning">
                ৳{formatCurrency(filteredSales.reduce((sum, sale) => sum + Number(sale.prize_out_cost || 0), 0))}
              </TableCell>
              <TableCell className="text-primary">
                ৳{formatCurrency(filteredSales.reduce((sum, sale) => sum + calculatePayToClowee(sale), 0))}
              </TableCell>
              <TableCell>
                {filteredSales.filter(sale => getPaymentStatus(sale).status === 'Due').length} Due
              </TableCell>
              <TableCell className="sticky right-0 bg-primary/10"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Sales Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {paginatedSales.map((sale) => {
          const paymentInfo = getPaymentStatus(sale);
          return (
            <Card key={sale.id} className="bg-gradient-card border-border shadow-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
                      <Coins className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{sale.machines?.machine_name || 'Unknown Machine'}</div>
                      <div className="text-xs text-muted-foreground">{sale.machines?.machine_number}</div>
                    </div>
                  </div>
                  <Badge 
                    className={`text-xs ${
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
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Invoice No</div>
                    <div className="font-mono font-medium text-primary">{sale.invoice_number || 'Pending'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Date</div>
                    <div className="font-medium">{formatDate(sale.sales_date)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Coin Sales</div>
                    <div className="font-medium text-primary">{formatNumber(sale.coin_sales)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Sales Amount</div>
                    <div className="font-medium text-success">৳{formatCurrency(sale.sales_amount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Prize Out</div>
                    <div className="font-medium text-accent">{formatNumber(sale.prize_out_quantity)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Prize Cost</div>
                    <div className="font-medium text-warning">৳{formatCurrency(sale.prize_out_cost)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Pay To Clowee</div>
                    <div className="font-medium text-primary">৳{formatCurrency(calculatePayToClowee(sale))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Payment</div>
                    <div>
                      {paymentInfo.totalPaid > 0 && (
                        <div className="text-xs text-muted-foreground">Paid: ৳{formatCurrency(paymentInfo.totalPaid)}</div>
                      )}
                      {paymentInfo.balance > 0 && (
                        <div className="text-xs text-destructive">Due: ৳{formatCurrency(paymentInfo.balance)}</div>
                      )}
                      {paymentInfo.status === 'Overpaid' && (
                        <div className="text-xs text-blue-600">Over: ৳{formatCurrency(paymentInfo.totalPaid - calculatePayToClowee(sale))}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewingSale(sale)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setViewingInvoice(sale)}
                    className="flex-1 border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Invoice
                  </Button>
                  {canEdit && (
                  <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingSale(sale)}
                    className="p-2"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-destructive text-destructive hover:bg-destructive/10 p-2"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this sales record?')) {
                        deleteSale.mutate(sale.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
          
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              by: <span className="font-medium text-foreground">{sale.created_by_user?.name || 'Unknown'}</span>
            </div>
            <Button onClick={onClose}>Close</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}