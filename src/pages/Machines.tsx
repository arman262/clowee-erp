import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Cpu, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Building2,
  MapPin,
  Calendar,
  Activity,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { useMachines, useCreateMachine, useUpdateMachine, useDeleteMachine } from "@/hooks/useMachines";
import { MachineForm } from "@/components/forms/MachineForm";
import { MachineDetailsModal } from "@/components/MachineDetailsModal";
import { TablePager } from "@/components/TablePager";
import { usePagination } from "@/hooks/usePagination";
import { formatDate } from "@/lib/dateUtils";

export default function Machines() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any | null>(null);
  const [viewingMachine, setViewingMachine] = useState<any | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: machines, isLoading } = useMachines();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredMachines = machines?.filter((machine: any) =>
    machine.machine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.machine_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (machine.franchises?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedMachines = [...filteredMachines].sort((a, b) => {
    if (!sortColumn) return parseInt(a.machine_number) - parseInt(b.machine_number);
    let aVal: any, bVal: any;
    switch (sortColumn) {
      case 'number':
        aVal = parseInt(a.machine_number) || 0;
        bVal = parseInt(b.machine_number) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'name':
        aVal = a.machine_name || '';
        bVal = b.machine_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'franchise':
        aVal = a.franchises?.name || '';
        bVal = b.franchises?.name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'location':
        aVal = a.branch_location || '';
        bVal = b.branch_location || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'date':
        aVal = new Date(a.installation_date).getTime();
        bVal = new Date(b.installation_date).getTime();
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'coins':
        aVal = a.initial_coin_counter || 0;
        bVal = b.initial_coin_counter || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'prizes':
        aVal = a.initial_prize_counter || 0;
        bVal = b.initial_prize_counter || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'status':
        aVal = a.notes?.includes('[STATUS:inactive]') ? 'Inactive' : 'Active';
        bVal = b.notes?.includes('[STATUS:inactive]') ? 'Inactive' : 'Active';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        return 0;
    }
  });

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedMachines,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: sortedMachines });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Machine Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage gaming machines across all franchises
          </p>
        </div>
        {canEdit && (
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
              <Plus className="h-4 w-4 mr-2" />
              Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Add New Machine</DialogTitle>
            <MachineForm
              onSubmit={(data) => {
                createMachine.mutate(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>
            {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {machines?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Machines</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {machines?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Active Machines</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search machines by name, number, or franchise..."
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
      {/* Machines Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('number')}>
                <div className="flex items-center gap-1">
                  Machine Number
                  {sortColumn === 'number' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Machine
                  {sortColumn === 'name' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('franchise')}>
                <div className="flex items-center gap-1">
                  Franchise
                  {sortColumn === 'franchise' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('location')}>
                <div className="flex items-center gap-1">
                  Location
                  {sortColumn === 'location' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Installation Date
                  {sortColumn === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('coins')}>
                <div className="flex items-center gap-1">
                  Initial Coins
                  {sortColumn === 'coins' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('prizes')}>
                <div className="flex items-center gap-1">
                  Initial Prizes
                  {sortColumn === 'prizes' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">
                  Status
                  {sortColumn === 'status' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMachines.map((machine: any, index) => (
              <TableRow key={machine.id}>
                <TableCell className="font-mono font-medium text-primary">
                  {machine.machine_number}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                      <Cpu className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{machine.machine_name}</div>
                      <div className="text-sm text-muted-foreground">{machine.esp_id}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span>{machine.franchises?.name || 'No Franchise'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{machine.branch_location}</span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(machine.installation_date)}</TableCell>
                <TableCell className="text-primary font-medium">{machine.initial_coin_counter.toLocaleString()}</TableCell>
                <TableCell className="text-accent font-medium">{machine.initial_prize_counter.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={machine.notes?.includes('[STATUS:inactive]') ? 'bg-destructive text-destructive-foreground' : 'bg-success text-success-foreground'}>
                    {machine.notes?.includes('[STATUS:inactive]') ? 'Inactive' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setViewingMachine(machine)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                    <>
                    <Dialog open={editingMachine?.id === machine.id} onOpenChange={(open) => !open && setEditingMachine(null)}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingMachine(machine)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogTitle className="sr-only">Edit Machine</DialogTitle>
                        <MachineForm
                          initialData={machine}
                          onSubmit={(data) => {
                            updateMachine.mutate({ id: machine.id, ...data });
                            setEditingMachine(null);
                          }}
                          onCancel={() => setEditingMachine(null)}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this machine?')) {
                          deleteMachine.mutate(machine.id);
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

      {/* Pagination */}
      <TablePager
        totalRows={totalRows}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
      
      {/* Machine Details Modal */}
      <MachineDetailsModal
        machine={viewingMachine}
        open={!!viewingMachine}
        onOpenChange={(open) => !open && setViewingMachine(null)}
      />


    </div>
  );
}