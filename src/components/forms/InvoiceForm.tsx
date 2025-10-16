import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFranchises } from "@/hooks/useFranchises";
import { useMachines } from "@/hooks/useMachines";

interface InvoiceFormProps {
  onSubmit: (data: TablesInsert<'invoices'>) => void;
  onCancel: () => void;
  initialData?: Partial<TablesInsert<'invoices'>>;
}

export function InvoiceForm({ onSubmit, onCancel, initialData }: InvoiceFormProps) {
  const { data: franchises } = useFranchises();
  const { data: machines } = useMachines();
  
  const [formData, setFormData] = useState({
    franchise_id: initialData?.franchise_id || "",
    machine_id: initialData?.machine_id || "",
    invoice_date: initialData?.invoice_date || new Date().toISOString().split('T')[0],
    total_sales: initialData?.total_sales || 0,
    total_prize_cost: initialData?.total_prize_cost || 0,
    electricity_cost: initialData?.electricity_cost || 0,
    vat_amount: initialData?.vat_amount || 0,
    net_profit: initialData?.net_profit || 0,
    franchise_share_amount: initialData?.franchise_share_amount || 0,
    clowee_share_amount: initialData?.clowee_share_amount || 0,
    pay_to_clowee: initialData?.pay_to_clowee +initialData?.total_prize_cost || 0,
    status: initialData?.status || 'Draft'
  });

  // Auto-calculate values when inputs change
  useEffect(() => {
    const totalCosts = formData.total_prize_cost + (formData.electricity_cost || 0);
    const grossProfit = formData.total_sales - totalCosts;
    const netProfit = grossProfit - (formData.vat_amount || 0);
    
    // Get franchise share percentage (assuming 60/40 split if no franchise selected)
    const franchiseSharePercent = 0.6; // You might want to get this from franchise data
    const cloweeSharePercent = 0.4;
    
    const franchiseShare = netProfit * franchiseSharePercent;
    const cloweeShare = netProfit * cloweeSharePercent;
    
    setFormData(prev => ({
      ...prev,
      net_profit: netProfit,
      franchise_share_amount: franchiseShare,
      clowee_share_amount: cloweeShare,
      pay_to_clowee: cloweeShare
    }));
  }, [formData.total_sales, formData.total_prize_cost, formData.electricity_cost, formData.vat_amount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      franchise_id: formData.franchise_id || null,
      machine_id: formData.machine_id || null
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Invoice' : 'Create New Invoice'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="franchise_id">Franchise</Label>
              <Select 
                value={formData.franchise_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, franchise_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select franchise" />
                </SelectTrigger>
                <SelectContent>
                  {franchises?.map((franchise) => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      {franchise.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine_id">Machine</Label>
              <Select 
                value={formData.machine_id || ''} 
                onValueChange={(value) => setFormData({ ...formData, machine_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
                <SelectContent>
                  {machines?.sort((a, b) => (a.machine_number || 0) - (b.machine_number || 0)).map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.machine_name} ({machine.machine_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date*</Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:invert"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_sales">Total Sales (৳)*</Label>
              <Input
                id="total_sales"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_sales}
                onChange={(e) => setFormData({ ...formData, total_sales: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total_prize_cost">Prize Cost (৳)*</Label>
              <Input
                id="total_prize_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_prize_cost}
                onChange={(e) => setFormData({ ...formData, total_prize_cost: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="electricity_cost">Electricity Cost (৳)</Label>
              <Input
                id="electricity_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.electricity_cost || ''}
                onChange={(e) => setFormData({ ...formData, electricity_cost: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vat_amount">VAT Amount (৳)</Label>
              <Input
                id="vat_amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.vat_amount || ''}
                onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-secondary/20 p-4 rounded-lg">
            <div className="space-y-2">
              <Label>Net Profit (Calculated)</Label>
              <div className="p-2 bg-secondary/50 rounded text-center font-semibold">
                ৳{formData.net_profit.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Franchise Share (Calculated)</Label>
              <div className="p-2 bg-secondary/50 rounded text-center font-semibold">
                ৳{formData.franchise_share_amount.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Clowee Share (Calculated)</Label>
              <div className="p-2 bg-secondary/50 rounded text-center font-semibold">
                ৳{formData.clowee_share_amount.toLocaleString()}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status || 'Draft'} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              {initialData ? 'Update' : 'Create'} Invoice
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}