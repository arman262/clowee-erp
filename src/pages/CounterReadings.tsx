import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Activity, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Cpu,
  Calendar,
  Loader2,
  Calculator
} from "lucide-react";
import { useMachineCounters, useCreateMachineCounter, useUpdateMachineCounter, useDeleteMachineCounter } from "@/hooks/useMachineCounters";
import { useCombinedCounterReadings } from "@/hooks/useCombinedCounterReadings";
import { CounterReadingForm } from "@/components/forms/CounterReadingForm";
import { CounterReadingDetailsModal } from "@/components/CounterReadingDetailsModal";
import { PayToCloweeModal } from "@/components/PayToCloweeModal";
import { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateUtils";

export default function CounterReadings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPayToClowee, setShowPayToClowee] = useState(false);
  const [editingReading, setEditingReading] = useState<Tables<'machine_counters'> | null>(null);
  const [viewingReading, setViewingReading] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: combinedReadings, isLoading } = useCombinedCounterReadings();
  const createReading = useCreateMachineCounter();
  const updateReading = useUpdateMachineCounter();
  const deleteReading = useDeleteMachineCounter();

  const filteredReadings = combinedReadings?.filter(reading =>
    reading.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reading.machines?.machine_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reading.machines?.franchises?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredReadings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReadings = filteredReadings.slice(startIndex, startIndex + itemsPerPage);

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
        <div className="flex gap-3">
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
          <Button 
            onClick={() => setShowPayToClowee(true)}
            className="bg-gradient-accent hover:opacity-90 shadow-neon"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Pay to Clowee
          </Button>
        </div>
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

      {/* Readings Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>Franchise</TableHead>
              <TableHead>Reading Date</TableHead>
              <TableHead>Coin Counter</TableHead>
              <TableHead>Prize Counter</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReadings.map((reading) => {
              const isInitial = reading.type === 'initial';
              return (
                <TableRow key={reading.id} className={isInitial ? 'bg-secondary/20' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isInitial ? 'bg-gradient-primary' : 'bg-gradient-accent'
                      }`}>
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{reading.machines?.machine_name || 'Unknown Machine'}</div>
                        <div className="text-sm text-muted-foreground">{reading.machines?.machine_number}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      <span>{reading.machines?.franchises?.name || 'No Franchise'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(reading.reading_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-primary font-medium">{reading.coin_counter.toLocaleString()}</TableCell>
                  <TableCell className="text-accent font-medium">{reading.prize_counter.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={isInitial ? 'default' : 'secondary'} className={isInitial ? 'bg-primary text-primary-foreground' : ''}>
                      {isInitial ? 'Initial' : 'Reading'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-32 truncate" title={reading.notes || ''}>
                      {reading.notes || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingReading(reading)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!isInitial && (
                        <>
                          <Dialog open={editingReading?.id === reading.id} onOpenChange={(open) => !open && setEditingReading(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setEditingReading(reading as Tables<'machine_counters'>)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                              <CounterReadingForm
                                initialData={reading as Tables<'machine_counters'>}
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
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredReadings.length)} of {filteredReadings.length} results
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-3 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Counter Reading Details Modal */}
      <CounterReadingDetailsModal
        reading={viewingReading}
        open={!!viewingReading}
        onOpenChange={(open) => !open && setViewingReading(null)}
      />
      
      {/* Pay to Clowee Modal */}
      <PayToCloweeModal
        open={showPayToClowee}
        onOpenChange={setShowPayToClowee}
      />
    </div>
  );
}