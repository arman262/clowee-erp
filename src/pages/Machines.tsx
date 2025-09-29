import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Loader2
} from "lucide-react";
import { useMachines, useCreateMachine, useUpdateMachine, useDeleteMachine } from "@/hooks/useMachines";
import { MachineForm } from "@/components/forms/MachineForm";
import { MachineDetailsModal } from "@/components/MachineDetailsModal";
import { formatDate } from "@/lib/dateUtils";

export default function Machines() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState<any | null>(null);
  const [viewingMachine, setViewingMachine] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: machines, isLoading } = useMachines();
  const createMachine = useCreateMachine();
  const updateMachine = useUpdateMachine();
  const deleteMachine = useDeleteMachine();

  const filteredMachines = machines?.filter(machine =>
    machine.machine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.machine_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (machine.franchises?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredMachines.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMachines = filteredMachines.slice(startIndex, startIndex + itemsPerPage);

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
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
              <Plus className="h-4 w-4 mr-2" />
              Add Machine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <MachineForm
              onSubmit={(data) => {
                createMachine.mutate(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
            {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              0
            </div>
            <div className="text-sm text-muted-foreground">Maintenance</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {machines?.reduce((sum, m) => sum + m.initial_coin_counter, 0).toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Coins</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              --
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
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
              <TableHead>Machine</TableHead>
              <TableHead>Franchise</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Installation Date</TableHead>
              <TableHead>Initial Coins</TableHead>
              <TableHead>Initial Prizes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMachines.map((machine) => (
              <TableRow key={machine.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-accent rounded-lg flex items-center justify-center">
                      <Cpu className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{machine.machine_name}</div>
                      <div className="text-sm text-muted-foreground">{machine.machine_number} • {machine.esp_id}</div>
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
                  <Badge className="bg-success text-success-foreground">Active</Badge>
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredMachines.length)} of {filteredMachines.length} results
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
      
      {/* Machine Details Modal */}
      <MachineDetailsModal
        machine={viewingMachine}
        open={!!viewingMachine}
        onOpenChange={(open) => !open && setViewingMachine(null)}
      />


    </div>
  );
}