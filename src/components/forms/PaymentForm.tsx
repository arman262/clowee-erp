import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dateUtils";
import { useMachines } from "@/hooks/useMachines";
import { useBanks } from "@/hooks/useBanks";
import { useSales } from "@/hooks/useSales";
import { useMachinePayments } from "@/hooks/useMachinePayments";

const calculatePayToClowee = (sale: any) => {
  const coinPrice = sale.franchises?.coin_price || 0;
  const dollPrice = sale.franchises?.doll_price || 0;
  const vatPercentage = sale.franchises?.vat_percentage || 0;
  const cloweeShare = sale.franchises?.clowee_share || 40;
  const maintenancePercentage = sale.franchises?.maintenance_percentage || 0;
  const electricityCost = sale.franchises?.electricity_cost || 0;
  const amountAdjustment = sale.amount_adjustment || 0;
  
  const calculatedSalesAmount = (sale.coin_sales || 0) * coinPrice;
  const calculatedPrizeCost = (sale.prize_out_quantity || 0) * dollPrice;
  const calculatedVatAmount = calculatedSalesAmount * vatPercentage / 100;
  const netProfit = calculatedSalesAmount - calculatedVatAmount - calculatedPrizeCost;
  const maintenanceAmount = maintenancePercentage > 0 ? netProfit * maintenancePercentage / 100 : 0;
  const profitAfterMaintenance = netProfit - maintenanceAmount;
  const calculatedCloweeProfit = (profitAfterMaintenance * cloweeShare) / 100;
  
  return calculatedCloweeProfit + calculatedPrizeCost + maintenanceAmount - electricityCost - amountAdjustment;
};

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

  // Filter to show only due invoices and sort by sales date (newest to oldest)
  const dueInvoices = sales?.filter(sale => {
    const salePayments = payments?.filter(p => p.invoice_id === sale.id) || [];
    const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const payToClowee = calculatePayToClowee(sale);
    return totalPaid < payToClowee;
  }).sort((a, b) => new Date(b.sales_date).getTime() - new Date(a.sales_date).getTime()) || [];
  const [formData, setFormData] = useState({
    machine_id: initialData?.machine_id || "",
    bank_id: initialData?.bank_id || "",
    invoice_id: initialData?.invoice_id || "",
    payment_date: initialData?.payment_date ? new Date(initialData.payment_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: initialData?.amount || 0,
    remarks: initialData?.remarks || "",
  });
  const [openInvoiceCombobox, setOpenInvoiceCombobox] = useState(false);



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
            <Popover open={openInvoiceCombobox} onOpenChange={setOpenInvoiceCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openInvoiceCombobox}
                  className="w-full justify-between"
                >
                  {formData.invoice_id
                    ? (() => {
                        const selectedSale = sales?.find(s => s.id === formData.invoice_id);
                        if (!selectedSale) return "Select Due Invoice";
                        const salePayments = payments?.filter(p => p.invoice_id === selectedSale.id) || [];
                        const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                        const balance = calculatePayToClowee(selectedSale) - totalPaid;
                        return `${formatDate(selectedSale.sales_date)} - ${selectedSale.machines?.machine_name} - ৳${balance.toLocaleString()}`;
                      })()
                    : "Select Due Invoice"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] p-0">
                <Command>
                  <CommandInput placeholder="Search invoices..." />
                  <CommandList>
                    <CommandEmpty>No invoices found.</CommandEmpty>
                    <CommandGroup>
                      {!sales ? (
                        <CommandItem disabled>Loading invoices...</CommandItem>
                      ) : dueInvoices.length === 0 ? (
                        <CommandItem disabled>No due invoices available</CommandItem>
                      ) : (
                        dueInvoices.map((sale) => {
                          const salePayments = payments?.filter(p => p.invoice_id === sale.id) || [];
                          const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                          const balance = calculatePayToClowee(sale) - totalPaid;
                          return (
                            <CommandItem
                              key={sale.id}
                              value={`${formatDate(sale.sales_date)} ${sale.machines?.machine_name} ${balance}`}
                              onSelect={() => {
                                setFormData({ 
                                  ...formData, 
                                  invoice_id: sale.id,
                                  machine_id: sale.machine_id || "",
                                  payment_date: sale.sales_date || formData.payment_date
                                });
                                setOpenInvoiceCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.invoice_id === sale.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {formatDate(sale.sales_date)} - {sale.machines?.machine_name} - ৳{balance.toLocaleString()}
                            </CommandItem>
                          );
                        })
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
              className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:invert"
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
            const totalPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const payToClowee = selectedSale ? calculatePayToClowee(selectedSale) : 0;
            const remainingDue = Math.max(0, payToClowee - totalPaid);
            const currentPayment = Number(formData.amount || 0);
            const newTotal = totalPaid + currentPayment;
            const balanceAfterPayment = Math.max(0, payToClowee - newTotal);
            
            return (
              <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
                <h4 className="font-medium text-sm">Payment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount Due:</span>
                    <span className="font-medium">৳{payToClowee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Paid:</span>
                    <span className="text-success">৳{totalPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining Due:</span>
                    <span className="text-destructive">৳{remainingDue.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-medium">
                    <span>Current Payment:</span>
                    <span className="text-primary">৳{currentPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>After Payment:</span>
                    <span className={balanceAfterPayment === 0 ? 'text-success' : 'text-warning'}>
                      {balanceAfterPayment === 0 ? 'Fully Paid' : `Due: ৳${balanceAfterPayment.toLocaleString()}`}
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