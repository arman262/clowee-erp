import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

import { useMachines } from "@/hooks/useMachines";
import { useActiveExpenseCategories } from "@/hooks/useExpenseCategories";
import { useBanks } from "@/hooks/useBanks";

interface Employee {
  employee_id: string;
  name: string;
  designation: string;
}

interface ExpenseFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function ExpenseForm({ onSubmit, onCancel, initialData }: ExpenseFormProps) {
  const { data: machines } = useMachines();
  const { data: categories } = useActiveExpenseCategories();
  const { data: banks } = useBanks();
  
  const [formData, setFormData] = useState(() => {
    let expenseDate = new Date().toISOString().split('T')[0];
    let expenseMonth = new Date().toISOString().slice(0, 7);
    
    if (initialData?.expense_date) {
      const date = new Date(initialData.expense_date);
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      expenseDate = localDate;
      expenseMonth = localDate.slice(0, 7);
    }
    
    return {
      category_id: initialData?.category_id ? String(initialData.category_id) : "",
      machine_id: initialData?.machine_id ? String(initialData.machine_id) : "",
      bank_id: initialData?.bank_id ? String(initialData.bank_id) : "",
      expense_date: expenseDate,
      expense_month: expenseMonth,
      total_amount: initialData?.total_amount || 0,
      expense_details: initialData?.expense_details || "",
      quantity: initialData?.quantity || 1,
      employee_id: initialData?.employee_id || "",
      item_name: initialData?.item_name || "",
    };
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isMonthlyExpense, setIsMonthlyExpense] = useState(false);
  const [prizeQuantity, setPrizeQuantity] = useState(initialData?.quantity || 1);
  const [prizeRate, setPrizeRate] = useState(initialData?.item_price || 0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isEmployeeSalary, setIsEmployeeSalary] = useState(false);
  const [isAccessoryCategory, setIsAccessoryCategory] = useState(false);
  const [accessoryItems, setAccessoryItems] = useState<Array<{item_name: string, quantity: number, unit_price: number}>>(() => {
    if (initialData?.item_name) {
      return [{
        item_name: initialData.item_name,
        quantity: initialData.quantity || 1,
        unit_price: initialData.item_price || 0
      }];
    }
    return [{item_name: "", quantity: 1, unit_price: 0}];
  });

  const monthlyCategories = ["Employee Salary", "Factory Rent", "Office Rent", "Server Bill"];

  useEffect(() => {
    const selectedCategory = categories?.find(cat => String(cat.id) === formData.category_id);
    const categoryName = selectedCategory?.category_name?.trim();
    console.log('Selected Category:', categoryName, '| Length:', categoryName?.length);
    
    setIsMonthlyExpense(selectedCategory ? monthlyCategories.includes(categoryName) : false);
    setIsEmployeeSalary(categoryName === 'Employee Salary');
    
    const isAccessory = categoryName?.includes('Accessories') || false;
    console.log('Is Accessory Category:', isAccessory, '| Category:', categoryName);
    setIsAccessoryCategory(isAccessory);
    
    // Auto-calculate total for Accessories
    if (isAccessory) {
      const calculatedTotal = accessoryItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      setFormData(prev => ({ ...prev, total_amount: calculatedTotal }));
    }
    
    // Auto-calculate total for Prize Purchase
    if (categoryName === 'Prize Purchase') {
      const calculatedTotal = prizeQuantity * prizeRate;
      setFormData(prev => ({ ...prev, total_amount: calculatedTotal, quantity: prizeQuantity }));
    }
  }, [formData.category_id, categories, prizeQuantity, prizeRate, accessoryItems]);

  useEffect(() => {
    if (isEmployeeSalary || initialData?.employee_id) {
      fetch('http://202.59.208.112:3008/api/employees')
        .then(res => res.json())
        .then(result => setEmployees(result.data || []))
        .catch(err => console.error('Error fetching employees:', err));
    }
  }, [isEmployeeSalary, initialData?.employee_id]);

  const isPrizePurchase = categories?.find(cat => String(cat.id) === formData.category_id)?.category_name === 'Prize Purchase';

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.category_id) {
      newErrors.category_id = "Category is required";
    }
    
    if (isEmployeeSalary && !formData.employee_id) {
      newErrors.employee_id = "Employee Name is required for Employee Salary";
    }
    
    if (!formData.total_amount || formData.total_amount <= 0) {
      newErrors.total_amount = "Amount must be greater than 0";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // For accessories with multiple items, create separate expense entries sequentially
    if (isAccessoryCategory && accessoryItems.length > 0) {
      for (const item of accessoryItems) {
        const itemData = {
          machine_id: formData.machine_id && formData.machine_id !== "none" ? formData.machine_id : null,
          category_id: formData.category_id ? Number(formData.category_id) : null,
          bank_id: formData.bank_id || null,
          expense_date: isMonthlyExpense ? formData.expense_month + "-01" : formData.expense_date,
          expense_details: formData.expense_details || "Expense",
          quantity: item.quantity,
          item_price: item.unit_price,
          total_amount: item.quantity * item.unit_price,
          employee_id: null,
          item_name: item.item_name,
        };
        await onSubmit(itemData);
        // Small delay to ensure unique expense numbers
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }
    
    const submitData = {
      machine_id: formData.machine_id && formData.machine_id !== "none" ? formData.machine_id : null,
      category_id: formData.category_id ? Number(formData.category_id) : null,
      bank_id: formData.bank_id || null,
      expense_date: isMonthlyExpense ? formData.expense_month + "-01" : formData.expense_date,
      expense_details: formData.expense_details || "Expense",
      quantity: isPrizePurchase ? prizeQuantity : (formData.quantity || 1),
      item_price: isPrizePurchase ? prizeRate : (formData.total_amount / (formData.quantity || 1)),
      total_amount: formData.total_amount,
      employee_id: isEmployeeSalary ? formData.employee_id : null,
      item_name: null,
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

          {/* Employee or Machine Field */}
          {isEmployeeSalary ? (
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee Name*</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(value) => {
                  setFormData({ ...formData, employee_id: value });
                  setErrors({ ...errors, employee_id: "" });
                }}
              >
                <SelectTrigger className={errors.employee_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} - {emp.designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-sm text-destructive">{errors.employee_id}</p>
              )}
            </div>
          ) : (
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
          )}

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
                className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:contrast-150"
                required
              />
            ) : (
              <Input
                id="expense_date"
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                className="[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:contrast-150"
                required
              />
            )}
          </div>

          {/* Accessory Line Items */}
          {isAccessoryCategory && (
            <div className="space-y-3">
              <Label>Items*</Label>
              {accessoryItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {index === 0 && <Label className="text-xs mb-1">Item Name</Label>}
                    <Input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => {
                        const newItems = [...accessoryItems];
                        newItems[index].item_name = e.target.value;
                        setAccessoryItems(newItems);
                      }}
                      placeholder="Item name"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs mb-1">Qty</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...accessoryItems];
                        newItems[index].quantity = Number(e.target.value);
                        setAccessoryItems(newItems);
                      }}
                      placeholder="Qty"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    {index === 0 && <Label className="text-xs mb-1">Unit Price</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => {
                        const newItems = [...accessoryItems];
                        newItems[index].unit_price = Number(e.target.value);
                        setAccessoryItems(newItems);
                      }}
                      placeholder="Price"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs mb-1">Total</Label>}
                    <Input
                      type="text"
                      value={`৳${(item.quantity * item.unit_price).toFixed(2)}`}
                      disabled
                      className="bg-secondary/30"
                    />
                  </div>
                  <div className="col-span-1">
                    {index === 0 && <div className="h-5"></div>}
                    {accessoryItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-destructive text-destructive h-10 w-10 p-0"
                        onClick={() => {
                          const newItems = accessoryItems.filter((_, i) => i !== index);
                          setAccessoryItems(newItems);
                        }}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAccessoryItems([...accessoryItems, {item_name: "", quantity: 1, unit_price: 0}])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          )}

          {/* Prize Purchase Fields */}
          {isPrizePurchase && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prize_quantity">Quantity*</Label>
                <Input
                  id="prize_quantity"
                  type="number"
                  min="1"
                  value={prizeQuantity}
                  onChange={(e) => {
                    setPrizeQuantity(Number(e.target.value));
                    setErrors({ ...errors, quantity: "" });
                  }}
                  placeholder="Enter quantity"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prize_rate">Prize Rate (৳)*</Label>
                <Input
                  id="prize_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={prizeRate}
                  onChange={(e) => {
                    setPrizeRate(Number(e.target.value));
                    setErrors({ ...errors, prize_rate: "" });
                  }}
                  placeholder="Enter prize rate"
                  required
                />
              </div>
            </div>
          )}

          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="total_amount">
              {isPrizePurchase || isAccessoryCategory ? "Total Amount (৳)" : "Amount (৳)*"}
            </Label>
            <Input
              id="total_amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.total_amount}
              onChange={(e) => {
                if (!isPrizePurchase && !isAccessoryCategory) {
                  setFormData({ ...formData, total_amount: Number(e.target.value) });
                  setErrors({ ...errors, total_amount: "" });
                }
              }}
              className={errors.total_amount ? "border-destructive" : ""}
              placeholder={isPrizePurchase || isAccessoryCategory ? "Auto-calculated" : "Enter amount"}
              disabled={isPrizePurchase || isAccessoryCategory}
              required
            />
            {errors.total_amount && (
              <p className="text-sm text-destructive">{errors.total_amount}</p>
            )}
          </div>

          {/* Banks Field */}
          <div className="space-y-2">
            <Label htmlFor="bank_id">Bank</Label>
            <Select
              value={formData.bank_id}
              onValueChange={(value) => setFormData({ ...formData, bank_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={banks ? "Select Bank" : "Loading banks..."} />
              </SelectTrigger>
              <SelectContent>
                {!banks ? (
                  <SelectItem value="loading" disabled>Loading banks...</SelectItem>
                ) : banks.length === 0 ? (
                  <SelectItem value="no-data" disabled>No banks available</SelectItem>
                ) : (
                  banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.bank_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
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

          {/* Quantity - Hidden for Prize Purchase, Employee Salary, and Accessories */}
          {!isPrizePurchase && !isEmployeeSalary && !isAccessoryCategory && (
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
          )}

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