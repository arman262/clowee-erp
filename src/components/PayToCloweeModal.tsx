import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMachines } from "@/hooks/useMachines";
import { useFranchises } from "@/hooks/useFranchises";
import { useFranchiseAgreements, getEffectiveAgreement } from "@/hooks/useFranchiseAgreements";
import { useMachineCounters } from "@/hooks/useMachineCounters";
import { useCreateSale, useSales } from "@/hooks/useSales";
import { Loader2, Calculator, Coins, Gift } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface PayToCloweeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayToCloweeModal({ open, onOpenChange }: PayToCloweeModalProps) {
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  
  // Reset machine selection when date changes
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedMachine(""); // Clear machine selection
    setCalculations(null); // Clear calculations
  };
  const [coinAdjustment, setCoinAdjustment] = useState("");
  const [prizeAdjustment, setPrizeAdjustment] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [calculations, setCalculations] = useState<{
    coinSales: number;
    salesAmount: number;
    prizeOut: number;
    prizeOutCost: number;
    currentReading: any;
    previousReading: any;
    initialReading: any;
    adjustedCoinSales: number;
    adjustedPrizeOut: number;
    adjustedSalesAmount: number;
    adjustedPrizeCost: number;
    vatAmount: number;
    netSalesAmount: number;
    netRevenue: number;
    cloweeProfit: number;
    franchiseProfit: number;
    payToClowee: number;
  } | null>(null);

  const { data: machines } = useMachines();
  const { data: franchises } = useFranchises();
  const { data: counterReadings } = useMachineCounters();
  const { data: existingSales, refetch: refetchSales } = useSales();
  const createSale = useCreateSale();
  
  // Extract actual machine ID from selected value
  const getActualMachineId = () => {
    if (!selectedMachine) return '';
    // For half-monthly: "uuid-first" or "uuid-second", for monthly: just "uuid"
    if (selectedMachine.endsWith('-first')) {
      return selectedMachine.slice(0, -6); // Remove "-first"
    }
    if (selectedMachine.endsWith('-second')) {
      return selectedMachine.slice(0, -7); // Remove "-second"
    }
    return selectedMachine;
  };

  const selectedMachineData = machines?.find(m => m.id === getActualMachineId());
  const { data: agreements } = useFranchiseAgreements(selectedMachineData?.franchise_id || '');
  const franchiseData = franchises?.find(f => f.id === selectedMachineData?.franchise_id);
  
  // Group machines by payment duration and filter based on selected date
  const getMachineOptions = () => {
    if (!selectedDate || !machines) return [];
    
    const selectedDateObj = new Date(selectedDate);
    const selectedDay = selectedDateObj.getDate();
    const selectedMonth = selectedDateObj.getMonth();
    const selectedYear = selectedDateObj.getFullYear();
    const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const isEndOfMonth = selectedDay === lastDayOfMonth;
    
    const options: Array<{ id: string; label: string; value: string; machineNumber: number }> = [];
    
    machines.forEach(machine => {
      const franchise = franchises?.find(f => f.id === machine.franchise_id);
      if (!franchise) return;
      
      const paymentDuration = franchise.payment_duration;
      
      if (paymentDuration === 'Half Month' || paymentDuration === 'Half Monthly') {
        // For half monthly, check both halves
        ['first', 'second'].forEach(half => {
          const hasSalesInHalf = existingSales?.some(sale => {
            if (sale.machine_id !== machine.id) return false;
            const saleDate = new Date(sale.sales_date);
            if (saleDate.getMonth() !== selectedMonth || saleDate.getFullYear() !== selectedYear) return false;
            const saleHalf = saleDate.getDate() <= 15 ? 'first' : 'second';
            return saleHalf === half;
          });
          
          if (!hasSalesInHalf) {
            const period = half === 'first' ? '1st Half' : '2nd Half';
            options.push({
              id: `${machine.id}-${half}`,
              label: `${machine.machine_name} - ${machine.machine_number} (${period})`,
              value: `${machine.id}-${half}`,
              machineNumber: machine.machine_number || 0
            });
          }
        });
      } else {
        // For monthly, only show if it's end of month OR if no sales exist
        const hasSalesInMonth = existingSales?.some(sale => {
          if (sale.machine_id !== machine.id) return false;
          const saleDate = new Date(sale.sales_date);
          return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
        });
        
        if (!hasSalesInMonth && isEndOfMonth) {
          options.push({
            id: machine.id,
            label: `${machine.machine_name} - ${machine.machine_number} (Full Month)`,
            value: machine.id,
            machineNumber: machine.machine_number || 0
          });
        }
      }
    });
    
    return options.sort((a, b) => a.machineNumber - b.machineNumber);
  };
  
  const machineOptions = getMachineOptions();
  
  // Get agreement values or fallback to franchise values (matching InvoicePrint logic)
  const getAgreementValue = (field: string) => {
    if (!agreements || agreements.length === 0 || !selectedDate) {
      return franchiseData?.[field];
    }
    
    const latestAgreement = agreements
      .filter(a => new Date(a.effective_date) <= new Date(selectedDate))
      .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
    
    if (latestAgreement) {
      return latestAgreement[field];
    }
    return franchiseData?.[field];
  };

  const calculateSales = () => {
    const actualMachineId = getActualMachineId();
    const machineData = machines?.find(m => m.id === actualMachineId);
    const franchise = franchises?.find(f => f.id === machineData?.franchise_id);
    
    console.log('Calculate button clicked');
    console.log('Data check:', { 
      selectedMachine, 
      actualMachineId,
      selectedDate, 
      machineData: !!machineData,
      franchise: !!franchise,
      counterReadings: counterReadings?.length || 0
    });
    
    if (!selectedMachine || !selectedDate || !franchise) {
      console.log('Missing required data:', { selectedMachine, selectedDate, franchise });
      alert('Please select both machine and date before calculating.');
      return;
    }

    const machineReadings = counterReadings?.filter(r => r.machine_id === actualMachineId) || [];
    const initialReading = null; // No initial readings in machine_counters table
    const sortedReadings = machineReadings.sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime());
    
    // Find the latest reading on or before the selected date
    const currentReading = sortedReadings
      .filter(r => new Date(r.reading_date) <= new Date(selectedDate))
      .pop();

    if (!currentReading) {
      console.log('No counter reading found for selected date');
      console.log('Available readings:', sortedReadings.map(r => ({ date: r.reading_date, coin: r.coin_counter })));
      alert('No counter reading found for the selected date. Please add a counter reading first.');
      return;
    }

    // Find the previous reading before the current one
    const previousReading = sortedReadings
      .filter(r => new Date(r.reading_date) < new Date(currentReading.reading_date))
      .pop();

    let previousCoinCounter = initialReading?.coin_counter || machineData?.initial_coin_counter || 0;
    let previousPrizeCounter = initialReading?.prize_counter || machineData?.initial_prize_counter || 0;

    if (previousReading) {
      previousCoinCounter = previousReading.coin_counter;
      previousPrizeCounter = previousReading.prize_counter;
    }

    const coinSales = currentReading.coin_counter - previousCoinCounter;
    const prizeOut = currentReading.prize_counter - previousPrizeCounter;
    
    const coinAdjustmentValue = parseInt(coinAdjustment) || 0;
    const prizeAdjustmentValue = parseInt(prizeAdjustment) || 0;
    
    const adjustedCoinSales = Math.max(0, coinSales - coinAdjustmentValue);
    const adjustedPrizeOut = Math.max(0, prizeOut - prizeAdjustmentValue);
    
    const coinPrice = getAgreementValue('coin_price') || 0;
    const dollPrice = getAgreementValue('doll_price') || 0;
    const vatPercentage = getAgreementValue('vat_percentage') || 0;
    const cloweeShare = getAgreementValue('clowee_share') || 40;
    const franchiseShare = getAgreementValue('franchise_share') || 60;
    const electricityCost = getAgreementValue('electricity_cost') || 0;
    
    const salesAmount = coinSales * coinPrice;
    const prizeOutCost = prizeOut * dollPrice;
    const adjustedSalesAmount = adjustedCoinSales * coinPrice;
    const adjustedPrizeCost = adjustedPrizeOut * dollPrice;
    
    // Calculate VAT
    const vatAmount = adjustedSalesAmount * vatPercentage / 100;
    
    // Calculate net profit (Sales - VAT - Prize Cost)
    const netProfit = adjustedSalesAmount - vatAmount - adjustedPrizeCost;
    
    // Calculate maintenance from net profit if maintenance percentage exists
    const maintenancePercentage = getAgreementValue('maintenance_percentage') || 0;
    const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
    
    // Calculate profit shares AFTER deducting maintenance
    const profitAfterMaintenance = netProfit - maintenanceAmount;
    const cloweeProfit = profitAfterMaintenance * cloweeShare / 100;
    const franchiseProfit = profitAfterMaintenance * franchiseShare / 100;
    
    const payToClowee = cloweeProfit + adjustedPrizeCost + maintenanceAmount - electricityCost;
    
    console.log('Calculation results:', {
      coinSales,
      prizeOut,
      adjustedCoinSales,
      adjustedPrizeOut,
      salesAmount,
      adjustedSalesAmount
    });

    setCalculations({
      coinSales,
      salesAmount,
      prizeOut,
      prizeOutCost,
      currentReading,
      previousReading,
      initialReading,
      adjustedCoinSales,
      adjustedPrizeOut,
      adjustedSalesAmount,
      adjustedPrizeCost,
      vatAmount,
      netSalesAmount: adjustedSalesAmount - vatAmount,
      netRevenue: netProfit,
      cloweeProfit,
      franchiseProfit,
      payToClowee
    });
  };

  const checkDuplicateSales = (salesDate: string, machineId: string, franchiseId: string) => {
    if (!existingSales || !franchiseData) return false;

    const selectedDate = new Date(salesDate);
    const paymentDuration = franchiseData.payment_duration;
    
    // Check for existing sales in the same billing period
    const conflictingSales = existingSales.filter(sale => {
      if (sale.machine_id !== machineId) return false;
      
      const saleDate = new Date(sale.sales_date);
      const saleMonth = saleDate.getMonth();
      const selectedMonth = selectedDate.getMonth();
      const saleYear = saleDate.getFullYear();
      const selectedYear = selectedDate.getFullYear();
      
      if (saleYear !== selectedYear || saleMonth !== selectedMonth) return false;
      
      if (paymentDuration === 'Half Month' || paymentDuration === 'Half Monthly') {
        const saleDay = saleDate.getDate();
        const selectedDay = selectedDate.getDate();
        
        // First half: 1-15, Second half: 16-31
        const saleHalf = saleDay <= 15 ? 'first' : 'second';
        const selectedHalf = selectedDay <= 15 ? 'first' : 'second';
        
        return saleHalf === selectedHalf;
      }
      
      // Full Month - any sale in the same month conflicts
      return true;
    });
    
    return conflictingSales.length > 0;
  };

  const handleSubmit = async () => {
    const actualMachineId = getActualMachineId();
    const machineData = machines?.find(m => m.id === actualMachineId);
    const franchise = franchises?.find(f => f.id === machineData?.franchise_id);
    
    if (!calculations || !selectedMachine || !selectedDate || !franchise) {
      console.log('Missing required data for submission');
      alert('Please fill in all required fields and calculate sales first.');
      return;
    }

    // Check for duplicate sales
    if (checkDuplicateSales(selectedDate, actualMachineId, franchise.id)) {
      const period = (franchise.payment_duration === 'Half Month' || franchise.payment_duration === 'Half Monthly') ? 'half-month' : 'month';
      alert(`A sales record already exists for this machine in the same ${period} billing period. Please check existing records.`);
      return;
    }

    try {

      const salesData = {
        machine_id: actualMachineId,
        franchise_id: franchise.id,
        sales_date: selectedDate,
        // invoice_number will be generated on server side automatically
        coin_sales: Math.round(Math.max(0, calculations.adjustedCoinSales)),
        sales_amount: Math.round(Math.max(0, calculations.adjustedSalesAmount) * 100) / 100,
        prize_out_quantity: Math.round(Math.max(0, calculations.adjustedPrizeOut)),
        prize_out_cost: Math.round(Math.max(0, calculations.adjustedPrizeCost) * 100) / 100,
        coin_adjustment: parseInt(coinAdjustment) || 0,
        prize_adjustment: parseInt(prizeAdjustment) || 0,
        adjustment_notes: adjustmentNotes?.trim() || null,
        vat_amount: Math.round(calculations.vatAmount * 100) / 100,
        net_sales_amount: Math.round(calculations.netSalesAmount * 100) / 100,
        clowee_profit: Math.round(calculations.cloweeProfit * 100) / 100,
        pay_to_clowee: Math.round(calculations.payToClowee * 100) / 100
      };
      
      console.log('Saving sales data:', salesData);
      
      // Validate data before sending
      if (salesData.coin_sales < 0 || salesData.prize_out_quantity < 0) {
        alert('Sales values cannot be negative. Please check your calculations.');
        return;
      }
      
      if (salesData.sales_amount <= 0) {
        alert('Sales amount must be greater than zero.');
        return;
      }
      
      await createSale.mutateAsync(salesData);

      // Reset form
      setSelectedMachine("");
      setSelectedDate("");
      setCoinAdjustment("");
      setPrizeAdjustment("");
      setAdjustmentNotes("");
      setCalculations(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating sale:", error);
      alert(`Failed to save sales data: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Pay to Clowee - Sales Calculation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Sales Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>

          {/* Machine Selection */}
          <div className="space-y-2">
            <Label htmlFor="machine">Select Machine</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine} disabled={!selectedDate}>
              <SelectTrigger>
                <SelectValue placeholder={selectedDate ? "Choose a machine" : "Select sales date first"} />
              </SelectTrigger>
              <SelectContent>
                {machineOptions.map((option) => (
                  <SelectItem key={option.id} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDate && machineOptions.length === 0 && (
              <p className="text-xs text-destructive">
                No machines available for this period (all have existing sales)
              </p>
            )}
          </div>



          {/* Adjustment Fields */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Adjustments (Optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coinAdjustment">Coin Adjustment</Label>
                <Input
                  id="coinAdjustment"
                  type="number"
                  placeholder="Free coins used"
                  value={coinAdjustment}
                  onChange={(e) => setCoinAdjustment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prizeAdjustment">Prize Adjustment</Label>
                <Input
                  id="prizeAdjustment"
                  type="number"
                  placeholder="Free prizes used"
                  value={prizeAdjustment}
                  onChange={(e) => setPrizeAdjustment(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustmentNotes">Adjustment Notes</Label>
              <Input
                id="adjustmentNotes"
                placeholder="Reason for adjustment (marketing, testing, etc.)"
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Calculate Button */}
          <Button 
            onClick={calculateSales}
            className="w-full bg-gradient-primary hover:opacity-90"
            disabled={!selectedMachine || !selectedDate}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Sales
          </Button>

          {/* Calculations Display */}
          {calculations && (
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Sales Calculation Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Coin Sales</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {calculations.adjustedCoinSales.toLocaleString()} coins
                    </p>
                    {(parseInt(coinAdjustment) || 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Raw: {calculations.coinSales.toLocaleString()} | Adj: -{parseInt(coinAdjustment)}
                      </p>
                    )}
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Sales Amount</span>
                    </div>
                    <p className="text-lg font-semibold text-success">
                      ৳{calculations.adjustedSalesAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculations.adjustedCoinSales.toLocaleString()} × ৳{(Number(getAgreementValue('coin_price')) || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">VAT Amount</span>
                    </div>
                    <p className="text-lg font-semibold text-destructive">
                      ৳{calculations.vatAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Net Sales (After Vat)</span>
                    </div>
                    <p className="text-lg font-semibold text-success">
                      ৳{calculations.netSalesAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Gift className="h-4 w-4 text-accent" />
                      <span className="text-sm text-muted-foreground">Prize Out</span>
                    </div>
                    <p className="text-lg font-semibold text-foreground">
                      {calculations.adjustedPrizeOut.toLocaleString()} pcs
                    </p>
                    {(parseInt(prizeAdjustment) || 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Raw: {calculations.prizeOut.toLocaleString()} | Adj: -{parseInt(prizeAdjustment)}
                      </p>
                    )}
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Prize Cost</span>
                    </div>
                    <p className="text-lg font-semibold text-warning">
                      ৳{calculations.adjustedPrizeCost.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {calculations.adjustedPrizeOut.toLocaleString()} × ৳{(Number(getAgreementValue('doll_price')) || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Net Profit</span>
                    </div>
                    <p className="text-lg font-semibold text-info">
                      ৳{calculations.netRevenue.toFixed(2)}
                    </p>
                  </div>
                  {(() => {
                    const maintenancePercentage = getAgreementValue('maintenance_percentage') || 0;
                    const maintenanceAmount = maintenancePercentage > 0 ? calculations.netRevenue * maintenancePercentage / 100 : 0;
                    return maintenanceAmount > 0 && (
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-muted-foreground">Maintenance ({maintenancePercentage}%)</span>
                        </div>
                        <p className="text-lg font-semibold text-destructive">
                          ৳{maintenanceAmount.toFixed(2)}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Clowee Profit</span>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      ৳{calculations.cloweeProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Franchise Profit</span>
                    </div>
                    <p className="text-lg font-semibold text-accent">
                      ৳{calculations.franchiseProfit.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Electricity Cost</span>
                    </div>
                    <p className="text-lg font-semibold text-destructive">
                      ৳{(Number(getAgreementValue('electricity_cost')) || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-primary/20 border border-primary/30 rounded-lg p-3 col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Pay To Clowee Calculation</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Clowee Profit + Prize Cost + Maintenance - Electricity Cost
                    </div>
                    <p className="text-xl font-bold text-primary">
                      ৳{calculations.payToClowee.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Reading Details */}
                <div className="border-t pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/20 rounded-lg p-3">
                      <h4 className="font-medium mb-2">Previous Reading</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{calculations.previousReading ? formatDate(calculations.previousReading.reading_date) : (calculations.initialReading ? formatDate(calculations.initialReading.reading_date) : 'Initial')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coin:</span>
                          <span>{calculations.previousReading ? calculations.previousReading.coin_counter : (calculations.initialReading?.coin_counter || selectedMachineData?.initial_coin_counter || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prize:</span>
                          <span>{calculations.previousReading ? calculations.previousReading.prize_counter : (calculations.initialReading?.prize_counter || selectedMachineData?.initial_prize_counter || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-secondary/20 rounded-lg p-3">
                      <h4 className="font-medium mb-2">Current Reading</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{formatDate(calculations.currentReading.reading_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Coin:</span>
                          <span>{calculations.currentReading.coin_counter}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prize:</span>
                          <span>{calculations.currentReading.prize_counter}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!calculations || createSale.isPending}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {createSale.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Sales Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}