import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMachines } from "@/hooks/useMachines";

interface ExpenseFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function ExpenseForm({ onSubmit, onCancel, initialData }: ExpenseFormProps) {
  const { data: machines } = useMachines();
  const [formData, setFormData] = useState({
    machine_id: initialData?.machine_id || "",
    expense_date: initialData?.expense_date || new Date().toISOString().split('T')[0],
    expense_details: initialData?.expense_details || "",
    unique_id: initialData?.unique_id || "",
    quantity: initialData?.quantity || 1,
    item_price: initialData?.item_price || 0,
  });

  const totalAmount = formData.quantity * formData.item_price;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total_amount: totalAmount
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Expense' : 'Add New Expense'}
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
            <Label htmlFor="expense_date">Expense Date*</Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense_details">Expense Details*</Label>
            <Textarea
              id="expense_details"
              value={formData.expense_details}
              onChange={(e) => setFormData({ ...formData, expense_details: e.target.value })}
              placeholder="Describe the expense..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unique_id">Unique ID</Label>
            <Input
              id="unique_id"
              value={formData.unique_id}
              onChange={(e) => setFormData({ ...formData, unique_id: e.target.value })}
              placeholder="Optional unique identifier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity*</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="item_price">Item Price*</Label>
              <Input
                id="item_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.item_price}
                onChange={(e) => setFormData({ ...formData, item_price: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="bg-secondary/20 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-lg font-bold text-success">৳{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90 flex-1">
              {initialData ? 'Update' : 'Add'} Expense
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