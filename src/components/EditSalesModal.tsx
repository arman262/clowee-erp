import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit } from "lucide-react";
import { formatDate, toBangladeshDate } from "@/lib/dateUtils";

interface EditSalesModalProps {
  sale: any;
  onClose: () => void;
  onUpdate: (data: any) => void;
}

export function EditSalesModal({ sale, onClose, onUpdate }: EditSalesModalProps) {
  const [salesDate, setSalesDate] = useState(() => {
    return toBangladeshDate(sale.sales_date) || new Date().toISOString().split('T')[0];
  });
  const [coinSales, setCoinSales] = useState(sale.coin_sales.toString());
  const [prizeOut, setPrizeOut] = useState(sale.prize_out_quantity.toString());
  const [coinAdjustment, setCoinAdjustment] = useState("0");
  const [prizeAdjustment, setPrizeAdjustment] = useState("0");
  const [adjustmentNotes, setAdjustmentNotes] = useState(sale.adjustment_notes || "");
  const [payToClowee, setPayToClowee] = useState(0);

  // Calculate Pay To Clowee whenever values change
  useEffect(() => {
    const coinSalesValue = parseInt(coinSales) || 0;
    const prizeOutValue = parseInt(prizeOut) || 0;
    const coinAdjustmentValue = parseInt(coinAdjustment) || 0;
    const prizeAdjustmentValue = parseInt(prizeAdjustment) || 0;

    const adjustedCoinSales = Math.max(0, coinSalesValue - coinAdjustmentValue);
    const adjustedPrizeOut = Math.max(0, prizeOutValue - prizeAdjustmentValue);

    const coinPrice = sale.franchises?.coin_price || 0;
    const dollPrice = sale.franchises?.doll_price || 0;
    const vatPercentage = sale.franchises?.vat_percentage || 0;
    const cloweeShare = sale.franchises?.clowee_share || 40;
    const electricityCost = sale.franchises?.electricity_cost || 0;

    const adjustedSalesAmount = adjustedCoinSales * coinPrice;
    const adjustedPrizeCost = adjustedPrizeOut * dollPrice;
    
    // Calculate VAT
    const vatAmount = adjustedSalesAmount * vatPercentage / 100;
    
    // Calculate Clowee profit: (sales - vat - prize cost) * clowee_share%
    const netAfterVatAndPrize = adjustedSalesAmount - vatAmount - adjustedPrizeCost;
    const cloweeProfit = netAfterVatAndPrize * cloweeShare / 100;
    
    // Calculate pay to Clowee
    const calculatedPayToClowee = cloweeProfit + adjustedPrizeCost - electricityCost;
    
    setPayToClowee(Math.max(0, calculatedPayToClowee));
  }, [coinSales, prizeOut, coinAdjustment, prizeAdjustment, sale.franchises]);

  const handleUpdate = () => {
    const coinSalesValue = parseInt(coinSales) || 0;
    const prizeOutValue = parseInt(prizeOut) || 0;
    const coinAdjustmentValue = parseInt(coinAdjustment) || 0;
    const prizeAdjustmentValue = parseInt(prizeAdjustment) || 0;

    const adjustedCoinSales = Math.max(0, coinSalesValue - coinAdjustmentValue);
    const adjustedPrizeOut = Math.max(0, prizeOutValue - prizeAdjustmentValue);

    const coinPrice = sale.franchises?.coin_price || 0;
    const dollPrice = sale.franchises?.doll_price || 0;
    const vatPercentage = sale.franchises?.vat_percentage || 0;
    const cloweeShare = sale.franchises?.clowee_share || 40;
    const electricityCost = sale.franchises?.electricity_cost || 0;

    const adjustedSalesAmount = adjustedCoinSales * coinPrice;
    const adjustedPrizeCost = adjustedPrizeOut * dollPrice;
    
    const vatAmount = adjustedSalesAmount * vatPercentage / 100;
    const netSalesAmount = adjustedSalesAmount - vatAmount;
    const netAfterVatAndPrize = adjustedSalesAmount - vatAmount - adjustedPrizeCost;
    const cloweeProfit = netAfterVatAndPrize * cloweeShare / 100;
    const calculatedPayToClowee = cloweeProfit + adjustedPrizeCost - electricityCost;

    onUpdate({
      sales_date: salesDate,
      coin_sales: adjustedCoinSales,
      sales_amount: adjustedSalesAmount,
      prize_out_quantity: adjustedPrizeOut,
      prize_out_cost: adjustedPrizeCost,
      vat_amount: vatAmount,
      net_sales_amount: netSalesAmount,
      clowee_profit: cloweeProfit,
      pay_to_clowee: Math.max(0, calculatedPayToClowee),
      adjustment_notes: adjustmentNotes
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="bg-gradient-card border-border shadow-card max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit Sales Record
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sales Date</Label>
            <Input 
              type="date" 
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Coin Sales</Label>
              <Input 
                type="number" 
                value={coinSales}
                onChange={(e) => setCoinSales(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Current Prize Out</Label>
              <Input 
                type="number" 
                value={prizeOut}
                onChange={(e) => setPrizeOut(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">Apply Adjustments</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coin Adjustment</Label>
                <Input 
                  type="number" 
                  placeholder="Coins to deduct"
                  value={coinAdjustment}
                  onChange={(e) => setCoinAdjustment(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Prize Adjustment</Label>
                <Input 
                  type="number" 
                  placeholder="Prizes to deduct"
                  value={prizeAdjustment}
                  onChange={(e) => setPrizeAdjustment(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea 
                placeholder="Add any additional notes or comments..."
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-secondary/20 rounded-lg p-3">
            <div className="text-sm font-medium mb-2">Calculation Preview:</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Coin Sales:</span>
                <span>{Math.max(0, parseInt(coinSales) - parseInt(coinAdjustment))} coins</span>
              </div>
              <div className="flex justify-between">
                <span>Prize Out:</span>
                <span>{Math.max(0, parseInt(prizeOut) - parseInt(prizeAdjustment))} pcs</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <span className="text-primary">Pay To Clowee:</span>
                <span className="text-primary">৳{payToClowee.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="flex-1">
              Update
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}