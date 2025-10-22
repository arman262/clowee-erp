import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMachines } from "@/hooks/useMachines";
import { useFranchises } from "@/hooks/useFranchises";
import { useCreateSale } from "@/hooks/useSales";
import { Loader2, Plus } from "lucide-react";

interface ManualSalesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualSalesModal({ open, onOpenChange }: ManualSalesModalProps) {
  const [selectedMachine, setSelectedMachine] = useState("");
  const [salesDate, setSalesDate] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [coinSales, setCoinSales] = useState("");
  const [salesAmount, setSalesAmount] = useState("");
  const [prizeOut, setPrizeOut] = useState("");
  const [prizeCost, setPrizeCost] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [netSalesAmount, setNetSalesAmount] = useState("");
  const [cloweeProfit, setCloweeProfit] = useState("");
  const [maintenanceCharge, setMaintenanceCharge] = useState("");
  const [electricityCost, setElectricityCost] = useState("");
  const [payToClowee, setPayToClowee] = useState("");

  const { data: machines } = useMachines();
  const { data: franchises } = useFranchises();
  const createSale = useCreateSale();

  const selectedMachineData = machines?.find(m => m.id === selectedMachine);
  const franchiseData = franchises?.find(f => f.id === selectedMachineData?.franchise_id);

  const resetForm = () => {
    setSelectedMachine("");
    setSalesDate("");
    setInvoiceNumber("");
    setCoinSales("");
    setSalesAmount("");
    setPrizeOut("");
    setPrizeCost("");
    setVatAmount("");
    setNetSalesAmount("");
    setCloweeProfit("");
    setMaintenanceCharge("");
    setElectricityCost("");
    setPayToClowee("");
  };

  const handleSubmit = async () => {
    if (!selectedMachine || !franchiseData) {
      alert('Please select a machine.');
      return;
    }

    try {
      const salesData = {
        machine_id: selectedMachine,
        franchise_id: franchiseData.id,
        sales_date: salesDate,
        invoice_number: invoiceNumber.trim() || null,
        coin_sales: parseInt(coinSales) || 0,
        sales_amount: parseFloat(salesAmount) || 0,
        prize_out_quantity: parseInt(prizeOut) || 0,
        prize_out_cost: parseFloat(prizeCost) || 0,
        vat_amount: parseFloat(vatAmount) || 0,
        net_sales_amount: parseFloat(netSalesAmount) || 0,
        clowee_profit: parseFloat(cloweeProfit) || 0,
        electricity_cost: parseFloat(electricityCost) || 0,
        pay_to_clowee: parseFloat(payToClowee) || 0,
        coin_adjustment: 0,
        prize_adjustment: 0,
        adjustment_notes: 'Manual Entry'
      };

      await createSale.mutateAsync(salesData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating manual sale:", error);
      alert(`Failed to save sales data: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add Manual Sales Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine">Select Machine</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a machine" />
              </SelectTrigger>
              <SelectContent>
                {machines?.sort((a, b) => (a.machine_number || 0) - (b.machine_number || 0)).map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.machine_name} - {machine.machine_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesDate">Sales Date</Label>
            <Input
              id="salesDate"
              type="date"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              type="text"
              placeholder="Leave empty for auto-generation"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coinSales">Coin Sales</Label>
              <Input
                id="coinSales"
                type="number"
                placeholder="0"
                value={coinSales}
                onChange={(e) => setCoinSales(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesAmount">Sales Amount</Label>
              <Input
                id="salesAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={salesAmount}
                onChange={(e) => setSalesAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prizeOut">Prize Out Quantity</Label>
              <Input
                id="prizeOut"
                type="number"
                placeholder="0"
                value={prizeOut}
                onChange={(e) => setPrizeOut(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prizeCost">Prize Cost</Label>
              <Input
                id="prizeCost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={prizeCost}
                onChange={(e) => setPrizeCost(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vatAmount">VAT Amount</Label>
              <Input
                id="vatAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={vatAmount}
                onChange={(e) => setVatAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="netSalesAmount">Net Sales Amount</Label>
              <Input
                id="netSalesAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={netSalesAmount}
                onChange={(e) => setNetSalesAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cloweeProfit">Clowee Profit</Label>
              <Input
                id="cloweeProfit"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cloweeProfit}
                onChange={(e) => setCloweeProfit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenanceCharge">Maintenance Charge</Label>
              <Input
                id="maintenanceCharge"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={maintenanceCharge}
                onChange={(e) => setMaintenanceCharge(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="electricityCost">Electricity Cost</Label>
              <Input
                id="electricityCost"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={electricityCost}
                onChange={(e) => setElectricityCost(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payToClowee">Pay To Clowee</Label>
              <Input
                id="payToClowee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={payToClowee}
                onChange={(e) => setPayToClowee(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createSale.isPending}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {createSale.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Sales
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
