import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFranchises } from "@/hooks/useFranchises";
import { useMachines } from "@/hooks/useMachines";
import { useSales } from "@/hooks/useSales";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/numberUtils";
import { Building2, Calendar, Cpu, FileText, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { FranchiseInvoicePrint } from "./FranchiseInvoicePrint";

interface FranchiseInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FranchiseInvoiceModal({ open, onOpenChange }: FranchiseInvoiceModalProps) {
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [periodType, setPeriodType] = useState<"half" | "full">("full");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [selectedHalf, setSelectedHalf] = useState<"first" | "second">("first");
  const [showInvoice, setShowInvoice] = useState(false);

  const { data: franchises } = useFranchises();
  const { data: machines } = useMachines();
  const { data: sales } = useSales();

  const selectedFranchise = franchises?.find(f => f.id === selectedFranchiseId);
  const franchiseMachines = machines?.filter(m => m.franchise_id === selectedFranchiseId) || [];

  // Calculate date range based on selection
  const getDateRange = () => {
    if (!selectedMonth) return { fromDate: "", toDate: "" };
    
    const [year, month] = selectedMonth.split('-').map(Number);
    
    if (periodType === "half") {
      if (selectedHalf === "first") {
        return {
          fromDate: `${year}-${month.toString().padStart(2, '0')}-01`,
          toDate: `${year}-${month.toString().padStart(2, '0')}-15`
        };
      } else {
        const lastDay = new Date(year, month, 0).getDate();
        return {
          fromDate: `${year}-${month.toString().padStart(2, '0')}-16`,
          toDate: `${year}-${month.toString().padStart(2, '0')}-${lastDay}`
        };
      }
    } else {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        fromDate: `${year}-${month.toString().padStart(2, '0')}-01`,
        toDate: `${year}-${month.toString().padStart(2, '0')}-${lastDay}`
      };
    }
  };

  const { fromDate, toDate } = getDateRange();

  // Filter sales for selected franchise and period
  const filteredSales = sales?.filter(sale => {
    if (!sale.sales_date || !selectedFranchiseId) return false;
    
    const saleDate = new Date(sale.sales_date);
    const saleDateLocal = new Date(saleDate.getTime() - saleDate.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    
    // Check if sale belongs to franchise machines
    const isFranchiseMachine = franchiseMachines.some(machine => machine.id === sale.machine_id);
    
    // Check if sale is within date range
    const isInDateRange = fromDate && toDate && saleDateLocal >= fromDate && saleDateLocal <= toDate;
    
    return isFranchiseMachine && isInDateRange;
  }) || [];

  // Calculate preview totals
  const previewTotals = filteredSales.reduce((acc, sale) => ({
    totalSales: acc.totalSales + Number(sale.sales_amount || 0),
    totalCoins: acc.totalCoins + (sale.coin_sales || 0),
    totalPrizeOut: acc.totalPrizeOut + (sale.prize_out_quantity || 0),
    totalPayToClowee: acc.totalPayToClowee + Number(sale.pay_to_clowee || 0)
  }), { totalSales: 0, totalCoins: 0, totalPrizeOut: 0, totalPayToClowee: 0 });

  // Auto-set period type based on franchise payment duration
  useEffect(() => {
    if (selectedFranchise?.payment_duration === 'Half Monthly') {
      setPeriodType("half");
    } else {
      setPeriodType("full");
    }
  }, [selectedFranchise]);

  const handleGenerateInvoice = () => {
    if (!selectedFranchise || !fromDate || !toDate || filteredSales.length === 0) return;
    setShowInvoice(true);
  };

  const canGenerateInvoice = selectedFranchiseId && fromDate && toDate && filteredSales.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Generate Franchise Consolidated Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Franchise Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="franchise">Select Franchise</Label>
                <Select value={selectedFranchiseId} onValueChange={setSelectedFranchiseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose franchise..." />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises?.map(franchise => (
                      <SelectItem key={franchise.id} value={franchise.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{franchise.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {machines?.filter(m => m.franchise_id === franchise.id).length || 0} machines
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Billing Period</Label>
                <Select value={periodType} onValueChange={(value: "half" | "full") => setPeriodType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Month</SelectItem>
                    <SelectItem value="half">Half Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Select Month</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              {periodType === "half" && (
                <div className="space-y-2">
                  <Label htmlFor="half">Select Half</Label>
                  <Select value={selectedHalf} onValueChange={(value: "first" | "second") => setSelectedHalf(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First Half (1-15)</SelectItem>
                      <SelectItem value="second">Second Half (16-End)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Period Display */}
            {fromDate && toDate && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      Billing Period: {formatDate(fromDate)} to {formatDate(toDate)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Franchise Info & Machine Preview */}
            {selectedFranchise && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Franchise Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Franchise Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedFranchise.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Payment Duration:</span>
                      <p className="font-medium">{selectedFranchise.payment_duration || 'Monthly'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Profit Share:</span>
                      <p className="font-medium">
                        Franchise: {selectedFranchise.franchise_share || 60}% | 
                        Clowee: {selectedFranchise.clowee_share || 40}%
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Machines:</span>
                      <p className="font-medium">{franchiseMachines.length} machines</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Sales Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Sales Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Sales:</span>
                      <span className="font-medium text-success">৳{formatCurrency(previewTotals.totalSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Coins:</span>
                      <span className="font-medium">{previewTotals.totalCoins.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Prize Out:</span>
                      <span className="font-medium">{previewTotals.totalPrizeOut.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pay to Clowee:</span>
                      <span className="font-medium text-primary">৳{formatCurrency(previewTotals.totalPayToClowee)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Invoices Found:</span>
                      <span className="font-medium">{filteredSales.length} records</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Machine List */}
            {franchiseMachines.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Machines Included ({franchiseMachines.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {franchiseMachines.map(machine => {
                      const machineSales = filteredSales.filter(sale => sale.machine_id === machine.id);
                      const machineTotal = machineSales.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0);
                      
                      return (
                        <div key={machine.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{machine.machine_name}</p>
                            <p className="text-xs text-muted-foreground">{machine.machine_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-success">৳{formatCurrency(machineTotal)}</p>
                            <p className="text-xs text-muted-foreground">{machineSales.length} sales</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {!canGenerateInvoice && selectedFranchiseId && (
                  <span className="text-warning">
                    {filteredSales.length === 0 ? "No sales found for selected period" : "Please complete all selections"}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateInvoice}
                  disabled={!canGenerateInvoice}
                  className="bg-gradient-primary"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Franchise Invoice Print Modal */}
      {showInvoice && selectedFranchise && (
        <FranchiseInvoicePrint
          franchise={selectedFranchise}
          sales={filteredSales}
          machines={franchiseMachines}
          fromDate={fromDate}
          toDate={toDate}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </>
  );
}