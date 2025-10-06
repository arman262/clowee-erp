import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";
import { useBanks } from "@/hooks/useBanks";

interface FranchiseFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function FranchiseForm({ onSubmit, onCancel, initialData }: FranchiseFormProps) {
  const { data: banks } = useBanks();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    coin_price: initialData?.coin_price || 5,
    doll_price: initialData?.doll_price || 25,
    electricity_cost: initialData?.electricity_cost || 500,
    vat_percentage: initialData?.vat_percentage || 7.5,
    franchise_share: initialData?.franchise_share || 60,
    clowee_share: initialData?.clowee_share || 40,
    payment_duration: initialData?.payment_duration || "Monthly",
    maintenance_percentage: initialData?.maintenance_percentage || null,
    security_deposit_type: initialData?.security_deposit_type || "",
    security_deposit_notes: initialData?.security_deposit_notes || "",
    payment_bank_id: initialData?.payment_bank_id || "",
    agreement_copy: initialData?.agreement_copy || "",
    trade_nid_copy: initialData?.trade_nid_copy || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Franchise' : 'Add New Franchise'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Franchise Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_duration">Payment Duration*</Label>
              <select 
                value={formData.payment_duration} 
                onChange={(e) => setFormData({ ...formData, payment_duration: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Weekly">Weekly</option>
                <option value="Bi-weekly">Bi-weekly</option>
                <option value="Half Monthly">Half Monthly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coin_price">Coin Price (৳)*</Label>
              <Input
                id="coin_price"
                type="number"
                step="0.01"
                value={formData.coin_price}
                onChange={(e) => setFormData({ ...formData, coin_price: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doll_price">Doll Price (৳)*</Label>
              <Input
                id="doll_price"
                type="number"
                step="0.01"
                value={formData.doll_price}
                onChange={(e) => setFormData({ ...formData, doll_price: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="electricity_cost">Electricity Cost (৳)*</Label>
              <Input
                id="electricity_cost"
                type="number"
                step="0.01"
                value={formData.electricity_cost}
                onChange={(e) => setFormData({ ...formData, electricity_cost: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vat_percentage">VAT %</Label>
              <Input
                id="vat_percentage"
                type="number"
                step="0.1"
                value={formData.vat_percentage || ''}
                onChange={(e) => setFormData({ ...formData, vat_percentage: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="franchise_share">Franchise Share (%)*</Label>
              <Input
                id="franchise_share"
                type="number"
                step="0.1"
                value={formData.franchise_share}
                onChange={(e) => setFormData({ ...formData, franchise_share: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clowee_share">Clowee Share (%)*</Label>
              <Input
                id="clowee_share"
                type="number"
                step="0.1"
                value={formData.clowee_share}
                onChange={(e) => setFormData({ ...formData, clowee_share: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maintenance_percentage">Maintenance %</Label>
              <Input
                id="maintenance_percentage"
                type="number"
                step="0.1"
                value={formData.maintenance_percentage || ''}
                onChange={(e) => setFormData({ ...formData, maintenance_percentage: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="security_deposit_type">Security Deposit Type</Label>
              <Input
                id="security_deposit_type"
                value={formData.security_deposit_type || ''}
                onChange={(e) => setFormData({ ...formData, security_deposit_type: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="security_deposit_notes">Security Deposit Notes</Label>
            <Textarea
              id="security_deposit_notes"
              value={formData.security_deposit_notes || ''}
              onChange={(e) => setFormData({ ...formData, security_deposit_notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_bank_id">Payment Bank Details</Label>
            <select 
              value={formData.payment_bank_id} 
              onChange={(e) => setFormData({ ...formData, payment_bank_id: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No Bank Selected</option>
              {banks?.filter(bank => bank.is_active).map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank_name} - {bank.account_number} ({bank.account_holder_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileUpload
              label="Agreement Copy (Optional)"
              accept=".pdf"
              value={formData.agreement_copy || ''}
              onChange={(file) => setFormData({ ...formData, agreement_copy: file })}
              fileType="agreement_copy"
            />
            
            <FileUpload
              label="Trade & NID Copy (Multiple files)"
              accept=".pdf,.jpg,.jpeg,.png"
              value={formData.trade_nid_copy || []}
              onChange={(files) => setFormData({ ...formData, trade_nid_copy: files })}
              fileType="trade_nid_copy"
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              {initialData ? 'Update' : 'Create'} Franchise
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