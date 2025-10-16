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
import { useMachines } from "@/hooks/useMachines";
import { useFranchises } from "@/hooks/useFranchises";
import { usePermissions } from "@/hooks/usePermissions";
import { CounterReadingForm } from "@/components/forms/CounterReadingForm";
import { CounterReadingDetailsModal } from "@/components/CounterReadingDetailsModal";
import { PayToCloweeModal } from "@/components/PayToCloweeModal";
import { TablePager } from "@/components/TablePager";
import { usePagination } from "@/hooks/usePagination";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dateUtils";

export default function CounterReadings() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPayToClowee, setShowPayToClowee] = useState(false);
  const [editingReading, setEditingReading] = useState<any | null>(null);
  const [viewingReading, setViewingReading] = useState<any | null>(null);

  const { data: readings, isLoading, error } = useMachineCounters();
  const { data: machines } = useMachines();
  const { data: franchises } = useFranchises();
  const createReading = useCreateMachineCounter();
  const updateReading = useUpdateMachineCounter();
  const deleteReading = useDeleteMachineCounter();

  // Combine readings with machine and franchise data, plus initial values
  const enrichedReadings = [];
  
  // Add initial counter values from machines table
  machines?.forEach(machine => {
    const franchise = franchises?.find(f => f.id === machine.franchise_id);
    if (machine.initial_coin_counter !== undefined || machine.initial_prize_counter !== undefined) {
      enrichedReadings.push({
        id: `initial-${machine.id}`,
        machine_id: machine.id,
        reading_date: machine.installation_date || machine.created_at || new Date().toISOString(),
        coin_counter: machine.initial_coin_counter || 0,
        prize_counter: machine.initial_prize_counter || 0,
        notes: 'Initial counter values',
        machine_name: machine.machine_name || 'Unknown Machine',
        machine_number: machine.machine_number || 'N/A',
        franchise_name: franchise?.name || 'No Franchise',
        is_initial: true
      });
    }
  });
  
  // Add actual readings
  readings?.forEach(reading => {
    const machine = machines?.find(m => m.id === reading.machine_id);
    const franchise = franchises?.find(f => f.id === machine?.franchise_id);
    enrichedReadings.push({
      ...reading,
      machine_name: machine?.machine_name || 'Unknown Machine',
      machine_number: machine?.machine_number || 'N/A',
      franchise_name: franchise?.name || 'No Franchise',
      is_initial: false
    });
  });
  
  // Sort by date descending (newest first)
  enrichedReadings.sort((a, b) => {
    return new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime();
  });

  const filteredReadings = enrichedReadings?.filter(reading => {
    const matchesSearch = reading.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reading.machine_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reading.franchise_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reading.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const readingDate = new Date(reading.reading_date);
    const matchesFromDate = !fromDate || readingDate >= new Date(fromDate);
    const matchesToDate = !toDate || readingDate <= new Date(toDate + 'T23:59:59');
    
    return matchesSearch && matchesFromDate && matchesToDate;
  }) || [];

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedReadings,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: filteredReadings });

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
        {canEdit && (
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
        )}
      </div>
      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by machine name, franchise, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="From Date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-secondary/30 border-border"
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="To Date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-secondary/30 border-border"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-4">
            <div className="text-center text-destructive">
              <p>Error loading counter readings: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}



      {/* No Data State */}
      {!isLoading && !error && (!readings || readings.length === 0) && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="p-8">
            <div className="text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Counter Readings Found</h3>
              <p className="text-muted-foreground mb-4">
                No counter readings have been recorded yet. Add your first reading to get started.
              </p>
              {canEdit && (
                <Button onClick={() => setShowAddForm(true)} className="bg-gradient-primary hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Reading
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Readings Table */}
      {!isLoading && !error && readings && readings.length > 0 && (
        <Card className="bg-gradient-card border-border shadow-card">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
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
            {paginatedReadings.map((reading, index) => (
              <TableRow key={reading.id} className={reading.is_initial ? 'bg-secondary/20' : ''}>
                <TableCell className="font-medium text-muted-foreground">
                  {getSerialNumber(index)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      reading.is_initial ? 'bg-gradient-primary' : 'bg-gradient-accent'
                    }`}>
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="font-medium">{reading.machine_name}</div>
                      <div className="text-sm text-muted-foreground">{reading.machine_number}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <span>{reading.franchise_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-white" />
                    <span>{formatDate(reading.reading_date)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-primary font-medium">{reading.coin_counter.toLocaleString()}</TableCell>
                <TableCell className="text-accent font-medium">{reading.prize_counter.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={reading.is_initial ? 'default' : 'secondary'} className={reading.is_initial ? 'bg-primary text-primary-foreground' : ''}>
                    {reading.is_initial ? 'Initial' : 'Reading'}
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
                    {canEdit && !reading.is_initial && (
                      <>
                        <Dialog open={editingReading?.id === reading.id} onOpenChange={(open) => !open && setEditingReading(null)}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingReading(reading)}
                            >
                              <Edit className="h-4 w-4" />
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
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && !error && readings && readings.length > 0 && (
        <TablePager
          totalRows={totalRows}
          rowsPerPage={rowsPerPage}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
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