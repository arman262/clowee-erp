import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, History } from "lucide-react";
import { useFranchiseAgreements, useCreateFranchiseAgreement, useUpdateFranchiseAgreement } from "@/hooks/useFranchiseAgreements";
import { formatDate, getCurrentBangladeshDate } from "@/lib/dateUtils";
import { useEffect } from "react";

interface FranchiseAgreementModalProps {
  franchise: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export function FranchiseAgreementModal({ franchise, open, onOpenChange, initialData }: FranchiseAgreementModalProps) {
  const [showAddForm, setShowAddForm] = useState(!!initialData);
  const [formData, setFormData] = useState({
    effective_date: getCurrentBangladeshDate(),
    coin_price: "",
    doll_price: "",
    electricity_cost: "",
    vat_percentage: "",
    franchise_share: "",
    clowee_share: "",
    payment_duration: "Monthly",
    notes: ""
  });

  const { data: agreements } = useFranchiseAgreements(franchise?.id);
  const createAgreement = useCreateFranchiseAgreement();
  const updateAgreement = useUpdateFranchiseAgreement();

  // Initialize form data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        effective_date: initialData.effective_date?.split('T')[0] || getCurrentBangladeshDate(),
        coin_price: initialData.coin_price?.toString() || "",
        doll_price: initialData.doll_price?.toString() || "",
        electricity_cost: initialData.electricity_cost?.toString() || "",
        vat_percentage: initialData.vat_percentage?.toString() || "",
        franchise_share: initialData.franchise_share?.toString() || "",
        clowee_share: initialData.clowee_share?.toString() || "",
        payment_duration: initialData.payment_duration || "Monthly",
        notes: initialData.notes || ""
      });
      setShowAddForm(true);
    }
  }, [initialData]);

  const handleSubmit = async () => {
    if (!formData.effective_date) {
      alert("Please select an effective date");
      return;
    }

    if (!formData.coin_price || !formData.doll_price) {
      alert("Please fill in coin price and doll price");
      return;
    }

    try {
      const agreementData = {
        franchise_id: franchise.id,
        effective_date: formData.effective_date,
        coin_price: Number(formData.coin_price),
        doll_price: Number(formData.doll_price),
        electricity_cost: Number(formData.electricity_cost) || 0,
        vat_percentage: Number(formData.vat_percentage) || 0,
        franchise_share: Number(formData.franchise_share) || 60,
        clowee_share: Number(formData.clowee_share) || 40,
        payment_duration: formData.payment_duration,
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (initialData) {
        // Update existing agreement
        console.log('Updating agreement:', initialData.id, agreementData);
        await updateAgreement.mutateAsync({ id: initialData.id, ...agreementData });
      } else {
        // Create new agreement
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        const newAgreementData = {
          id: generateUUID(),
          ...agreementData,
          created_at: new Date().toISOString()
        };
        
        console.log('Creating agreement:', newAgreementData);
        await createAgreement.mutateAsync(newAgreementData);
      }
      
      setShowAddForm(false);
      setFormData({
        effective_date: getCurrentBangladeshDate(),
        coin_price: "",
        doll_price: "",
        electricity_cost: "",
        vat_percentage: "",
        franchise_share: "",
        clowee_share: "",
        payment_duration: "Monthly",
        notes: ""
      });
    } catch (error) {
      console.error('Error saving agreement:', error);
      alert('Failed to save agreement: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            {initialData ? 'Edit Agreement' : 'Agreement History'} - {franchise?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Agreement Button */}
          <div className="flex justify-end">
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Agreement
            </Button>
          </div>

          {/* Add Agreement Form */}
          {showAddForm && (
            <Card className="bg-gradient-card border-border">
              <CardHeader>
                <CardTitle>{initialData ? 'Edit Agreement Terms' : 'New Agreement Terms'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Effective Date</Label>
                    <Input
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData({...formData, effective_date: e.target.value})}
                      className="[&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:invert"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Duration</Label>
                    <select 
                      className="w-full p-2 border rounded"
                      value={formData.payment_duration}
                      onChange={(e) => setFormData({...formData, payment_duration: e.target.value})}
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Half Month">Half Month</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Coin Price (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.coin_price}
                      onChange={(e) => setFormData({...formData, coin_price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Doll Price (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.doll_price}
                      onChange={(e) => setFormData({...formData, doll_price: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Electricity Cost (৳)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.electricity_cost}
                      onChange={(e) => setFormData({...formData, electricity_cost: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>VAT Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.vat_percentage}
                      onChange={(e) => setFormData({...formData, vat_percentage: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Franchise Share (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.franchise_share}
                      onChange={(e) => setFormData({...formData, franchise_share: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Clowee Share (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.clowee_share}
                      onChange={(e) => setFormData({...formData, clowee_share: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    placeholder="Reason for agreement change..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmit} 
                    className="bg-gradient-primary hover:opacity-90"
                    disabled={createAgreement.isPending || updateAgreement.isPending}
                  >
                    {(createAgreement.isPending || updateAgreement.isPending) ? 'Saving...' : (initialData ? 'Update Agreement' : 'Save Agreement')}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agreement History */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Agreement History</h3>
            {agreements && agreements.length > 0 ? agreements.map((agreement, index) => (
              <Card key={agreement.id} className="bg-gradient-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-white" />
                      <span className="font-medium">Effective: {formatDate(agreement.effective_date)}</span>
                    </div>
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      {index === 0 ? "Current" : "Historical"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Coin Price:</span>
                      <div className="font-medium">৳{agreement.coin_price}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Doll Price:</span>
                      <div className="font-medium">৳{agreement.doll_price}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Share Split:</span>
                      <div className="font-medium">{agreement.franchise_share}% / {agreement.clowee_share}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment:</span>
                      <div className="font-medium">{agreement.payment_duration}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No agreement history found</p>
                <p className="text-sm text-muted-foreground mt-1">Create the first agreement to start tracking changes</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}