import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMachines } from "@/hooks/useMachines";
import { useBanks } from "@/hooks/useBanks";
import { useSales } from "@/hooks/useSales";
import { useMachinePayments } from "@/hooks/useMachinePayments";

interface PaymentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function PaymentForm({ onSubmit, onCancel, initialData }: PaymentFormProps) {
  const { data: machines } = useMachines();
  const { data: banks } = useBanks();
  const { data: sales } = useSales();
  const { data: payments } = useMachinePayments();
  const [formData, setFormData] = useState({
    machine_id: initialData?.machine_id || "",
    bank_id: initialData?.bank_id || "",
    invoice_id: initialData?.invoice_id || "",
    payment_date: initialData?.payment_date ? new Date(initialData.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: initialData?.amount || 0,
    remarks: initialData?.remarks || "",
  });



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting payment data:', formData);
    onSubmit(formData);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Payment' : 'Add New Payment'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice_id">Invoice*</Label>
            <Select
              value={formData.invoice_id}
              onValueChange={(value) => {
                const selectedSale = sales?.find(s => s.id === value);
                setFormData({ 
                  ...formData, 
                  invoice_id: value,
                  machine_id: selectedSale?.machine_id || "",
                  payment_date: selectedSale?.sales_date || formData.payment_date
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={sales ? "Select Invoice" : "Loading invoices..."} />
              </SelectTrigger>
              <SelectContent>
                {!sales ? (
                  <SelectItem value="loading" disabled>Loading invoices...</SelectItem>
                ) : sales.length === 0 ? (
                  <SelectItem value="no-data" disabled>No invoices available</SelectItem>
                ) : (
                  sales.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.invoice_number || `CLW-${new Date(sale.sales_date).getDate().toString().padStart(2, '0')}-${(new Date(sale.sales_date).getMonth() + 1).toString().padStart(2, '0')}-M`} - {sale.machines?.machine_name} (৳{sale.sales_amount.toLocaleString()})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="machine_id">Machine*</Label>
            <Select
              value={formData.machine_id}
              onValueChange={(value) => setFormData({ ...formData, machine_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={machines ? "Select Machine" : "Loading machines..."} />
              </SelectTrigger>
              <SelectContent>
                {!machines ? (
                  <SelectItem value="loading" disabled>Loading machines...</SelectItem>
                ) : machines.length === 0 ? (
                  <SelectItem value="no-data" disabled>No machines available</SelectItem>
                ) : (
                  machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.machine_name} ({machine.machine_number})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date*</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount*</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="Enter payment amount"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_id">Bank*</Label>
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

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Optional payment notes or remarks..."
              rows={3}
            />
          </div>

          {/* Payment Summary */}
          {formData.invoice_id && (() => {
            const selectedSale = sales?.find(s => s.id === formData.invoice_id);
            const existingPayments = payments?.filter(p => p.invoice_id === formData.invoice_id) || [];
            const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
            const payToClowee = selectedSale?.pay_to_clowee || 0;
            const remainingDue = Math.max(0, payToClowee - totalPaid);
            const newTotal = totalPaid + formData.amount;
            
            return (
              <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-sm">Payment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount Due:</span>
                    <span className="font-medium">৳{Number(payToClowee || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Paid:</span>
                    <span className="text-success">৳{Number(totalPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Due:</span>
                    <span className="text-destructive">৳{Number(remainingDue || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-medium">
                    <span>Current Payment:</span>
                    <span className="text-primary">৳{Number(formData.amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>After Payment:</span>
                    <span className={newTotal >= payToClowee ? 'text-success' : 'text-warning'}>
                      {newTotal >= payToClowee ? 'Fully Paid' : `Due: ৳${Math.max(0, Number(payToClowee || 0) - newTotal).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90 flex-1">
              {initialData ? 'Update' : 'Add'} Payment
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