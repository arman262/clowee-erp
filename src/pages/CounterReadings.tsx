import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { 
  Activity, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Cpu,
  Calendar,
  Loader2
} from "lucide-react";
import { useMachineCounters, useCreateMachineCounter, useUpdateMachineCounter, useDeleteMachineCounter } from "@/hooks/useMachineCounters";
import { CounterReadingForm } from "@/components/forms/CounterReadingForm";
import { Tables } from "@/integrations/supabase/types";

export default function CounterReadings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReading, setEditingReading] = useState<Tables<'machine_counters'> | null>(null);

  const { data: readings, isLoading } = useMachineCounters();
  const createReading = useCreateMachineCounter();
  const updateReading = useUpdateMachineCounter();
  const deleteReading = useDeleteMachineCounter();

  const filteredReadings = readings?.filter(reading =>
    reading.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reading.machines?.machine_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reading.machines?.franchises?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Counter Readings
          </h1>
          <p className="text-muted-foreground mt-1">
            Record and track machine counter readings
          </p>
        </div>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
              <Plus className="h-4 w-4 mr-2" />
              Add Reading
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <CounterReadingForm
              onSubmit={(data) => {
                createReading.mutate(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search readings by machine name or franchise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Readings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredReadings.map((reading) => (
          <Card key={reading.id} className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center shadow-neon-accent">
                    <Activity className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">
                      {reading.machines?.machine_name || 'Unknown Machine'}
                    </CardTitle>
                    <CardDescription className="text-primary font-medium">
                      {reading.machines?.machine_number} • {reading.machines?.franchises?.name}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {new Date(reading.reading_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Counter Values */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-primary">
                    {reading.coin_counter.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Coin Counter</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-accent">
                    {reading.prize_counter.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Prize Counter</div>
                </div>
              </div>

              {/* Notes */}
              {reading.notes && (
                <div className="bg-secondary/20 rounded-lg p-3">
                  <div className="text-sm text-muted-foreground mb-1">Notes:</div>
                  <div className="text-sm text-foreground">{reading.notes}</div>
                </div>
              )}

              {/* Reading Date */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reading Date:</span>
                </div>
                <span className="text-foreground">
                  {new Date(reading.reading_date).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 border-border hover:bg-secondary/50">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Dialog open={editingReading?.id === reading.id} onOpenChange={(open) => !open && setEditingReading(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 border-border hover:bg-secondary/50"
                      onClick={() => setEditingReading(reading)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <CounterReadingForm
                      initialData={reading}
                      onSubmit={(data) => {
                        updateReading.mutate({ id: reading.id, ...data });
                        setEditingReading(null);
                      }}
                      onCancel={() => setEditingReading(null)}
                    />
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this reading?')) {
                      deleteReading.mutate(reading.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {readings?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Readings</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {readings?.filter(r => new Date(r.reading_date).toDateString() === new Date().toDateString()).length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Today's Readings</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              {readings?.reduce((sum, r) => sum + r.coin_counter, 0).toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Coins</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {readings?.reduce((sum, r) => sum + r.prize_counter, 0).toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Prizes</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}