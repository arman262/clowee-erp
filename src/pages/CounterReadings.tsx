import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Calculator,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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
  const [deletingReading, setDeletingReading] = useState<any | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
        is_initial: true,
        type: 'initial',
        machines: {
          machine_name: machine.machine_name || 'Unknown Machine',
          machine_number: machine.machine_number || 'N/A',
          franchises: { name: franchise?.name || 'No Franchise' }
        },
        created_at: machine.installation_date || machine.created_at || new Date().toISOString()
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
      is_initial: false,
      type: 'reading',
      machines: {
        machine_name: machine?.machine_name || 'Unknown Machine',
        machine_number: machine?.machine_number || 'N/A',
        franchises: { name: franchise?.name || 'No Franchise' }
      }
    });
  });

  // Sort by date descending (newest first)
  enrichedReadings.sort((a, b) => {
    return new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime();
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

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

  const sortedReadings = [...filteredReadings].sort((a, b) => {
    if (!sortColumn) return new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime();
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'machine':
        aVal = a.machine_name || '';
        bVal = b.machine_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'franchise':
        aVal = a.franchise_name || '';
        bVal = b.franchise_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'date':
        aVal = new Date(a.reading_date).getTime();
        bVal = new Date(b.reading_date).getTime();
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'coins':
        aVal = a.coin_counter || 0;
        bVal = b.coin_counter || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'prizes':
        aVal = a.prize_counter || 0;
        bVal = b.prize_counter || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'type':
        aVal = a.is_initial ? 'Initial' : 'Reading';
        bVal = b.is_initial ? 'Initial' : 'Reading';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        return 0;
    }
  });

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedReadings,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: sortedReadings });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Counter Readings
          </h1>
          <p className="text-muted-foreground mt-1">
            Record and track machine counter readings
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Reading
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle className="sr-only">Add Counter Reading</DialogTitle>
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
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('machine')}>
                    <div className="flex items-center gap-1">
                      Machine
                      {sortColumn === 'machine' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('franchise')}>
                    <div className="flex items-center gap-1">
                      Franchise
                      {sortColumn === 'franchise' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1">
                      Reading Date
                      {sortColumn === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('coins')}>
                    <div className="flex items-center gap-1">
                      Coin Counter
                      {sortColumn === 'coins' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('prizes')}>
                    <div className="flex items-center gap-1">
                      Prize Counter
                      {sortColumn === 'prizes' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1">
                      Type
                      {sortColumn === 'type' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                    </div>
                  </TableHead>
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
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reading.is_initial ? 'bg-gradient-primary' : 'bg-gradient-accent'
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
                                <DialogTitle className="sr-only">Edit Counter Reading</DialogTitle>
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
                              onClick={() => setDeletingReading(reading)}
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
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden p-3 space-y-3">
            {paginatedReadings.map((reading, index) => (
              <Card key={reading.id} className={`${reading.is_initial ? 'bg-secondary/20' : 'bg-secondary/5'} border-border`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reading.is_initial ? 'bg-gradient-primary' : 'bg-gradient-accent'}`}>
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{reading.machine_name}</div>
                        <div className="text-xs text-muted-foreground">{reading.machine_number}</div>
                      </div>
                    </div>
                    <Badge variant={reading.is_initial ? 'default' : 'secondary'} className={reading.is_initial ? 'bg-primary text-primary-foreground' : ''}>
                      {reading.is_initial ? 'Initial' : 'Reading'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Franchise</div>
                      <div className="flex items-center gap-1">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span className="text-xs">{reading.franchise_name}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Reading Date</div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-white" />
                        <span className="text-xs">{formatDate(reading.reading_date)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Coin Counter</div>
                      <div className="text-sm font-medium text-primary">{reading.coin_counter.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Prize Counter</div>
                      <div className="text-sm font-medium text-accent">{reading.prize_counter.toLocaleString()}</div>
                    </div>
                  </div>

                  {reading.notes && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Notes: </span>
                      <span>{reading.notes}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewingReading(reading)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canEdit && !reading.is_initial && (
                      <>
                        <Dialog open={editingReading?.id === reading.id} onOpenChange={(open) => !open && setEditingReading(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditingReading(reading)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogTitle className="sr-only">Edit Counter Reading</DialogTitle>
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
                        <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setDeletingReading(reading)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingReading}
        onOpenChange={(open) => !open && setDeletingReading(null)}
        onConfirm={() => deleteReading.mutate(deletingReading.id)}
        title="Delete Counter Reading"
        description="Are you sure you want to delete this counter reading?"
        details={[
          { label: "Machine", value: deletingReading?.machine_name || '' },
          { label: "Franchise", value: deletingReading?.franchise_name || '' },
          { label: "Reading Date", value: deletingReading ? formatDate(deletingReading.reading_date) : '' },
          { label: "Coin Counter", value: deletingReading?.coin_counter?.toLocaleString() || '0' },
          { label: "Prize Counter", value: deletingReading?.prize_counter?.toLocaleString() || '0' }
        ]}
      />
    </div>
  );
}