import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFranchises } from "@/hooks/useFranchises";

interface MachineFormProps {
  onSubmit: (data: TablesInsert<'machines'>) => void;
  onCancel: () => void;
  initialData?: Partial<TablesInsert<'machines'>>;
}

export function MachineForm({ onSubmit, onCancel, initialData }: MachineFormProps) {
  const { data: franchises } = useFranchises();
  const [formData, setFormData] = useState({
    machine_name: initialData?.machine_name || "",
    machine_number: initialData?.machine_number || "",
    esp_id: initialData?.esp_id || "",
    branch_location: initialData?.branch_location || "",
    installation_date: initialData?.installation_date || new Date().toISOString().split('T')[0],
    franchise_id: initialData?.franchise_id || "",
    initial_coin_counter: initialData?.initial_coin_counter || 0,
    initial_prize_counter: initialData?.initial_prize_counter || 0,
    notes: initialData?.notes || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData ? 'Edit Machine' : 'Add New Machine'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="machine_name">Machine Name*</Label>
              <Input
                id="machine_name"
                value={formData.machine_name}
                onChange={(e) => setFormData({ ...formData, machine_name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="machine_number">Machine Number*</Label>
              <Input
                id="machine_number"
                value={formData.machine_number}
                onChange={(e) => setFormData({ ...formData, machine_number: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="esp_id">ESP ID*</Label>
              <Input
                id="esp_id"
                value={formData.esp_id}
                onChange={(e) => setFormData({ ...formData, esp_id: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="installation_date">Installation Date*</Label>
              <Input
                id="installation_date"
                type="date"
                value={formData.installation_date}
                onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="franchise_id">Franchise</Label>
            <Select 
              value={formData.franchise_id || ''} 
              onValueChange={(value) => setFormData({ ...formData, franchise_id: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select franchise (optional)" />
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
            <Label htmlFor="branch_location">Branch Location*</Label>
            <Input
              id="branch_location"
              value={formData.branch_location}
              onChange={(e) => setFormData({ ...formData, branch_location: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial_coin_counter">Initial Coin Counter*</Label>
              <Input
                id="initial_coin_counter"
                type="number"
                min="0"
                value={formData.initial_coin_counter}
                onChange={(e) => setFormData({ ...formData, initial_coin_counter: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="initial_prize_counter">Initial Prize Counter*</Label>
              <Input
                id="initial_prize_counter"
                type="number"
                min="0"
                value={formData.initial_prize_counter}
                onChange={(e) => setFormData({ ...formData, initial_prize_counter: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              {initialData ? 'Update' : 'Create'} Machine
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