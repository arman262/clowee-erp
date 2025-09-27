import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablesInsert } from "@/integrations/supabase/types";
import { useMachines } from "@/hooks/useMachines";

interface CounterReadingFormProps {
  onSubmit: (data: TablesInsert<'machine_counters'>) => void;
  onCancel: () => void;
  initialData?: Partial<TablesInsert<'machine_counters'>>;
}

export function CounterReadingForm({ onSubmit, onCancel, initialData }: CounterReadingFormProps) {
  const { data: machines } = useMachines();
  const [formData, setFormData] = useState({
    machine_id: initialData?.machine_id || "",
    reading_date: initialData?.reading_date || new Date().toISOString().split('T')[0],
    coin_counter: initialData?.coin_counter || 0,
    prize_counter: initialData?.prize_counter || 0,
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
          {initialData ? 'Edit Counter Reading' : 'Add New Counter Reading'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="machine_id">Machine*</Label>
            <Select 
              value={formData.machine_id || ''} 
              onValueChange={(value) => setFormData({ ...formData, machine_id: value || null })}
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
            <Label htmlFor="reading_date">Reading Date*</Label>
            <Input
              id="reading_date"
              type="date"
              value={formData.reading_date}
              onChange={(e) => setFormData({ ...formData, reading_date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coin_counter">Coin Counter*</Label>
              <Input
                id="coin_counter"
                type="number"
                min="0"
                value={formData.coin_counter}
                onChange={(e) => setFormData({ ...formData, coin_counter: Number(e.target.value) })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prize_counter">Prize Counter*</Label>
              <Input
                id="prize_counter"
                type="number"
                min="0"
                value={formData.prize_counter}
                onChange={(e) => setFormData({ ...formData, prize_counter: Number(e.target.value) })}
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
              placeholder="Any observations or notes about this reading..."
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="bg-gradient-primary hover:opacity-90">
              {initialData ? 'Update' : 'Record'} Reading
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