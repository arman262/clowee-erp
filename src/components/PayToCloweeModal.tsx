import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMachines } from "@/hooks/useMachines";
import { useFranchises } from "@/hooks/useFranchises";
import { useCombinedCounterReadings } from "@/hooks/useCombinedCounterReadings";
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
    cloweeProfit: number;
    payToClowee: number;
  } | null>(null);

  const { data: machines } = useMachines();
  const { data: franchises } = useFranchises();
  const { data: counterReadings } = useCombinedCounterReadings();
  const { data: existingSales } = useSales();
  const createSale = useCreateSale();

  const selectedMachineData = machines?.find(m => m.id === selectedMachine);
  const franchiseData = franchises?.find(f => f.id === selectedMachineData?.franchise_id);

  const calculateSales = () => {
    console.log('Calculate button clicked');
    console.log('Data check:', { 
      selectedMachine, 
      selectedDate, 
      franchiseData: !!franchiseData,
      counterReadings: counterReadings?.length || 0
    });
    
    if (!selectedMachine || !selectedDate || !franchiseData) {
      console.log('Missing required data:', { selectedMachine, selectedDate, franchiseData });
      alert('Please select both machine and date before calculating.');
      return;
    }

    const machineReadings = counterReadings?.filter(r => r.machine_id === selectedMachine && r.type === 'reading') || [];
    const initialReading = counterReadings?.find(r => r.machine_id === selectedMachine && r.type === 'initial');
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

    let previousCoinCounter = initialReading?.coin_counter || selectedMachineData?.initial_coin_counter || 0;
    let previousPrizeCounter = initialReading?.prize_counter || selectedMachineData?.initial_prize_counter || 0;

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
    
    const salesAmount = coinSales * franchiseData.coin_price;
    const prizeOutCost = prizeOut * franchiseData.doll_price;
    const adjustedSalesAmount = adjustedCoinSales * franchiseData.coin_price;
    const adjustedPrizeCost = adjustedPrizeOut * franchiseData.doll_price;
    
    // Calculate VAT
    const vatAmount = adjustedSalesAmount * (franchiseData.vat_percentage || 0) / 100;
    
    // Calculate Clowee profit: (sales - vat - prize cost) * clowee_share%
    const netAfterVatAndPrize = adjustedSalesAmount - vatAmount - adjustedPrizeCost;
    const cloweeProfit = netAfterVatAndPrize * (franchiseData.clowee_share || 40) / 100;
    
    // Calculate pay to Clowee
    const electricityCost = franchiseData.electricity_cost || 0;
    const payToClowee = cloweeProfit + adjustedPrizeCost - electricityCost;
    
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
      cloweeProfit,
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
      
      if (paymentDuration === 'Half Month') {
        const saleDay = saleDate.getDate();
        const selectedDay = selectedDate.getDate();
        
        // First half: 1-15, Second half: 16-31
        const saleHalf = saleDay <= 15 ? 'first' : 'second';
        const selectedHalf = selectedDay <= 15 ? 'first' : 'second';
        
        return saleHalf === selectedHalf;
      } else {
        // Full month - any sale in the same month conflicts
        return true;
      }
    });
    
    return conflictingSales.length > 0;
  };

  const handleSubmit = async () => {
    if (!calculations || !selectedMachine || !selectedDate || !franchiseData) {
      console.log('Missing required data for submission');
      alert('Please fill in all required fields and calculate sales first.');
      return;
    }

    // Check for duplicate sales
    if (checkDuplicateSales(selectedDate, selectedMachine, franchiseData.id)) {
      const period = franchiseData.payment_duration === 'Half Month' ? 'half-month' : 'month';
      alert(`A sales record already exists for this machine in the same ${period} billing period. Please check existing records.`);
      return;
    }

    try {
      // Generate invoice number in new format
      const currentYear = new Date(selectedDate).getFullYear();
      const yearSales = existingSales?.filter(s => new Date(s.sales_date).getFullYear() === currentYear) || [];
      const nextNumber = (yearSales.length + 1).toString().padStart(3, '0');
      const invoiceNumber = `clw/${currentYear}/${nextNumber}`;

      const salesData = {
        machine_id: selectedMachine,
        franchise_id: franchiseData.id,
        sales_date: selectedDate,
        invoice_number: invoiceNumber,
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
          {/* Machine Selection */}
          <div className="space-y-2">
            <Label htmlFor="machine">Select Machine</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a machine" />
              </SelectTrigger>
              <SelectContent>
                {machines?.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.machine_name} - {machine.machine_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label htmlFor="date">Sales Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
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
                      ৳{calculations.adjustedSalesAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">VAT Amount</span>
                    </div>
                    <p className="text-lg font-semibold text-destructive">
                      ৳{calculations.vatAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Net Sales</span>
                    </div>
                    <p className="text-lg font-semibold text-success">
                      ৳{calculations.netSalesAmount.toLocaleString()}
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
                      ৳{calculations.adjustedPrizeCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-muted-foreground">Clowee Profit</span>
                    </div>
                    <p className="text-lg font-semibold text-primary">
                      ৳{calculations.cloweeProfit.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-primary/20 border border-primary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Pay To Clowee</span>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      ৳{calculations.payToClowee.toLocaleString()}
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