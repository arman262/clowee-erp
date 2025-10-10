import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useMachines } from "@/hooks/useMachines";
import { useActiveExpenseCategories } from "@/hooks/useExpenseCategories";

interface ExpenseFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function ExpenseForm({ onSubmit, onCancel, initialData }: ExpenseFormProps) {
  const { data: machines } = useMachines();
  const { data: categories } = useActiveExpenseCategories();
  
  const [formData, setFormData] = useState({
    category_id: initialData?.category_id ? String(initialData.category_id) : "",
    machine_id: initialData?.machine_id ? String(initialData.machine_id) : "",
    expense_date: initialData?.expense_date ? new Date(initialData.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    expense_month: initialData?.expense_month || new Date().toISOString().slice(0, 7),
    total_amount: initialData?.total_amount || 0,
    expense_details: initialData?.expense_details || "",
    reference_id: initialData?.reference_id || "",
    quantity: initialData?.quantity || 1,
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isMonthlyExpense, setIsMonthlyExpense] = useState(false);

  const monthlyCategories = ["Employee Salary", "Factory Rent", "Office Rent", "Server Bill"];

  useEffect(() => {
    const selectedCategory = categories?.find(cat => String(cat.id) === formData.category_id);
    setIsMonthlyExpense(selectedCategory ? monthlyCategories.includes(selectedCategory.category_name) : false);
  }, [formData.category_id, categories]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.category_id) {
      newErrors.category_id = "Category is required";
    }
    
    if (!formData.total_amount || formData.total_amount <= 0) {
      newErrors.total_amount = "Amount must be greater than 0";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const submitData = {
      machine_id: formData.machine_id && formData.machine_id !== "none" ? formData.machine_id : null,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      expense_date: isMonthlyExpense ? formData.expense_month + "-01" : formData.expense_date,
      expense_details: formData.expense_details || "Expense",
      unique_id: formData.reference_id || null,
      quantity: formData.quantity || 1,
      item_price: formData.total_amount / (formData.quantity || 1),
      total_amount: formData.total_amount,
    };
    
    onSubmit(submitData);
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
          {/* Category Field - First and Mandatory */}
          <div className="space-y-2">
            <Label htmlFor="category_id">Category*</Label>
            <Select 
              value={formData.category_id} 
              onValueChange={(value) => {
                setFormData({ ...formData, category_id: value });
                setErrors({ ...errors, category_id: "" });
              }}
            >
              <SelectTrigger className={errors.category_id ? "border-destructive" : ""}>
                <SelectValue placeholder={categories?.length ? "Select category" : "No categories available"} />
              </SelectTrigger>
              <SelectContent>
                {categories?.length ? (
                  categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.category_name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories" disabled>
                    No categories available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-destructive">{errors.category_id}</p>
            )}
          </div>

          {/* Machine Field - Optional */}
          <div className="space-y-2">
            <Label htmlFor="machine_id">Machine</Label>
            <Select 
              value={formData.machine_id} 
              onValueChange={(value) => setFormData({ ...formData, machine_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select machine (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No machine selected</SelectItem>
                {machines?.map((machine) => (
                  <SelectItem key={machine.id} value={String(machine.id)}>
                    {machine.machine_name} ({machine.machine_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic Date/Month Field */}
          <div className="space-y-2">
            <Label htmlFor={isMonthlyExpense ? "expense_month" : "expense_date"}>
              {isMonthlyExpense ? "Expense Month*" : "Expense Date*"}
            </Label>
            {isMonthlyExpense ? (
              <Input
                id="expense_month"
                type="month"
                value={formData.expense_month}
                onChange={(e) => setFormData({ ...formData, expense_month: e.target.value })}
                className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-200"
                required
              />
            ) : (
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:contrast-200"
                required
              />
            )}
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="total_amount">Amount (৳)*</Label>
            <Input
              id="total_amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => {
                setFormData({ ...formData, total_amount: Number(e.target.value) });
                setErrors({ ...errors, total_amount: "" });
              }}
              className={errors.total_amount ? "border-destructive" : ""}
              placeholder="Enter amount"
              required
            />
            {errors.total_amount && (
              <p className="text-sm text-destructive">{errors.total_amount}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="expense_details">Description / Notes</Label>
            <Textarea
              id="expense_details"
              value={formData.expense_details}
              onChange={(e) => setFormData({ ...formData, expense_details: e.target.value })}
              placeholder="Describe the expense (optional)..."
              rows={3}
            />
          </div>

          {/* Quantity and Reference ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                placeholder="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference_id">Reference ID</Label>
              <Input
                id="reference_id"
                value={formData.reference_id}
                onChange={(e) => setFormData({ ...formData, reference_id: e.target.value })}
                placeholder="Optional reference"
              />
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