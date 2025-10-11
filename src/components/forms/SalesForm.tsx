import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMachines } from "@/hooks/useMachines";
import { useSales } from "@/hooks/useSales";
import { getCurrentBangladeshDate } from "@/lib/dateUtils";

interface SalesFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function SalesForm({ onSubmit, onCancel, initialData }: SalesFormProps) {
  const { data: machines } = useMachines();
  const { data: existingSales } = useSales();
  const [formData, setFormData] = useState({
    machine_id: initialData?.machine_id || "",
    sales_date: initialData?.sales_date ? new Date(initialData.sales_date).toISOString().split('T')[0] : getCurrentBangladeshDate(),
    coin_sales: initialData?.coin_sales || 0,
    sales_amount: initialData?.sales_amount || 0,
    prize_out_quantity: initialData?.prize_out_quantity || 0,
    prize_out_cost: initialData?.prize_out_cost || 0,
    coin_adjustment: initialData?.coin_adjustment || 0,
    prize_adjustment: initialData?.prize_adjustment || 0,
    adjustment_notes: initialData?.adjustment_notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Database trigger will auto-generate invoice_number
    onSubmit(formData);
  };

  const netRevenue = formData.sales_amount - formData.prize_out_cost;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Sales Record' : 'Add New Sales Record'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine_id">Machine*</Label>
            <Select 
              value={formData.machine_id} 
              onValueChange={(value) => setFormData({ ...formData, machine_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                {machines?.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.machine_name} ({machine.machine_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sales_date">Sales Date*</Label>
            <Input
              id="sales_date"
              type="date"
              value={formData.sales_date}
              onChange={(e) => setFormData({ ...formData, sales_date: e.target.value })}
              className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coin_sales">Coin Sales*</Label>
              <Input
                id="coin_sales"
                type="number"
                min="0"
                value={formData.coin_sales}
                onChange={(e) => setFormData({ ...formData, coin_sales: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sales_amount">Sales Amount (৳)*</Label>
              <Input
                id="sales_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.sales_amount}
                onChange={(e) => setFormData({ ...formData, sales_amount: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prize_out_quantity">Prize Out Quantity</Label>
              <Input
                id="prize_out_quantity"
                type="number"
                min="0"
                value={formData.prize_out_quantity}
                onChange={(e) => setFormData({ ...formData, prize_out_quantity: Number(e.target.value) })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prize_out_cost">Prize Out Cost (৳)</Label>
              <Input
                id="prize_out_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.prize_out_cost}
                onChange={(e) => setFormData({ ...formData, prize_out_cost: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="bg-secondary/20 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Net Revenue:</span>
              <span className={`text-lg font-bold ${netRevenue >= 0 ? 'text-success' : 'text-destructive'}`}>
                ৳{netRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90 flex-1">
              {initialData ? 'Update' : 'Add'} Sales Record
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}