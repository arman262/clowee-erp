import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface EditSalesModalProps {
  sale: any;
  onClose: () => void;
  onUpdate: (data: any) => void;
}

export function EditSalesModal({ sale, onClose, onUpdate }: EditSalesModalProps) {
  const [coinSales, setCoinSales] = useState(sale.coin_sales.toString());
  const [prizeOut, setPrizeOut] = useState(sale.prize_out_quantity.toString());
  const [coinAdjustment, setCoinAdjustment] = useState("0");
  const [prizeAdjustment, setPrizeAdjustment] = useState("0");

  const handleUpdate = () => {
    const coinSalesValue = parseInt(coinSales) || 0;
    const prizeOutValue = parseInt(prizeOut) || 0;
    const coinAdjustmentValue = parseInt(coinAdjustment) || 0;
    const prizeAdjustmentValue = parseInt(prizeAdjustment) || 0;

    // Calculate adjusted values
    const adjustedCoinSales = Math.max(0, coinSalesValue - coinAdjustmentValue);
    const adjustedPrizeOut = Math.max(0, prizeOutValue - prizeAdjustmentValue);

    // Get franchise pricing
    const coinPrice = sale.franchises?.coin_price || 0;
    const dollPrice = sale.franchises?.doll_price || 0;

    const adjustedSalesAmount = adjustedCoinSales * coinPrice;
    const adjustedPrizeCost = adjustedPrizeOut * dollPrice;

    onUpdate({
      coin_sales: adjustedCoinSales,
      sales_amount: adjustedSalesAmount,
      prize_out_quantity: adjustedPrizeOut,
      prize_out_cost: adjustedPrizeCost
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
          <div className="text-sm text-muted-foreground mb-4">
            {sale.machines?.machine_name} - {formatDate(sale.sales_date)}
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
          </div>

          {/* Preview */}
          {(parseInt(coinAdjustment) > 0 || parseInt(prizeAdjustment) > 0) && (
            <div className="bg-secondary/20 rounded-lg p-3">
              <div className="text-sm font-medium mb-2">After Adjustment:</div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Coin Sales:</span>
                  <span>{Math.max(0, parseInt(coinSales) - parseInt(coinAdjustment))} coins</span>
                </div>
                <div className="flex justify-between">
                  <span>Prize Out:</span>
                  <span>{Math.max(0, parseInt(prizeOut) - parseInt(prizeAdjustment))} pcs</span>
                </div>
              </div>
            </div>
          )}
          
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