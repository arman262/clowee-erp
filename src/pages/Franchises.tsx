import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { 
  Building2, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  MapPin,
  DollarSign,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useFranchises, useCreateFranchise, useUpdateFranchise, useDeleteFranchise } from "@/hooks/useFranchises";
import { FranchiseForm } from "@/components/forms/FranchiseForm";
import { FranchiseDetailsModal } from "@/components/FranchiseDetailsModal";
import { TablePager } from "@/components/TablePager";
import { usePagination } from "@/hooks/usePagination";
import { cleanupPlaceholderFiles } from "@/utils/cleanupPlaceholderFiles";
import { clearAllInvoices } from "@/utils/clearInvoices";
import { checkInvoicesCount } from "@/utils/checkInvoices";
import { useQueryClient } from '@tanstack/react-query';
import { useFranchiseAgreements } from "@/hooks/useFranchiseAgreements";

export default function Franchises() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<any | null>(null);
  const [viewingFranchise, setViewingFranchise] = useState<any | null>(null);

  const { data: franchises, isLoading } = useFranchises();
  const createFranchise = useCreateFranchise();
  const updateFranchise = useUpdateFranchise();
  const deleteFranchise = useDeleteFranchise();
  const queryClient = useQueryClient();
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isClearingInvoices, setIsClearingInvoices] = useState(false);
  const [isCheckingInvoices, setIsCheckingInvoices] = useState(false);

  // Helper function to check if franchise has agreements
  const FranchiseActions = ({ franchise }: { franchise: any }) => {
    const { data: agreements } = useFranchiseAgreements(franchise.id);
    const hasAgreements = agreements && agreements.length > 0;

    return (
      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 border-border hover:bg-secondary/50"
          onClick={() => setViewingFranchise(franchise)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        {!hasAgreements && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-border hover:bg-secondary/50"
            onClick={() => setEditingFranchise(franchise)}
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (confirm('Are you sure you want to delete this franchise?')) {
              deleteFranchise.mutate(franchise.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  const handleCleanupFiles = async () => {
    setIsCleaningUp(true);
    try {
      await cleanupPlaceholderFiles();
      queryClient.invalidateQueries({ queryKey: ['franchises'] });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleClearInvoices = async () => {
    if (confirm('Are you sure you want to delete ALL invoices? This action cannot be undone.')) {
      setIsClearingInvoices(true);
      try {
        await clearAllInvoices();
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } finally {
        setIsClearingInvoices(false);
      }
    }
  };

  const handleCheckInvoices = async () => {
    setIsCheckingInvoices(true);
    try {
      await checkInvoicesCount();
    } finally {
      setIsCheckingInvoices(false);
    }
  };

  const filteredFranchises = franchises?.filter(franchise =>
    franchise?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedFranchises,
    handlePageChange,
    handleRowsPerPageChange,
  } = usePagination({ data: filteredFranchises, initialRowsPerPage: 12 });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Franchise Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage franchise partners and their gaming operations
          </p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 shadow-neon"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Franchise
        </Button>
      </div>

      {/* Add Franchise Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Add New Franchise</DialogTitle>
          <FranchiseForm
            onSubmit={(data) => {
              createFranchise.mutate(data);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {franchises?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Franchises</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              --
            </div>
            <div className="text-sm text-muted-foreground">Total Machines</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              --
            </div>
            <div className="text-sm text-muted-foreground">Total Monthly Sales</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {franchises?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Active Franchises</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search franchises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <Button variant="outline" className="border-border hover:bg-secondary/50">
              Export Data
              <Download className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              className="border-border hover:bg-secondary/50"
              onClick={handleCleanupFiles}
              disabled={isCleaningUp}
            >
              {isCleaningUp ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Cleanup Files
            </Button>
            <Button 
              variant="outline" 
              className="border-primary text-primary hover:bg-primary/10"
              onClick={handleCheckInvoices}
              disabled={isCheckingInvoices}
            >
              {isCheckingInvoices ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Check Invoices
            </Button>
            <Button 
              variant="outline" 
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleClearInvoices}
              disabled={isClearingInvoices}
            >
              {isClearingInvoices ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Clear Invoices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Franchises Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedFranchises.map((franchise: any) => (
          <Card key={franchise?.id} className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-neon">
                    <Building2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">
                      {franchise?.name || 'Unknown Franchise'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Franchise
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant="default"
                  className="bg-success text-success-foreground"
                >
                  Active
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Monthly Sales</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    --
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Share Split</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {franchise?.franchise_share || 0}% / {franchise?.clowee_share || 0}%
                  </p>
                </div>
              </div>

              {/* Pricing Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coin Price:</span>
                  <span className="text-foreground">৳{franchise?.coin_price || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doll Price:</span>
                  <span className="text-foreground">৳{franchise?.doll_price || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="text-foreground">{franchise?.payment_duration || 'N/A'}</span>
                </div>
              </div>

              {/* Actions */}
              <FranchiseActions franchise={franchise} />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Pagination */}
      <TablePager
        totalRows={totalRows}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingFranchise} onOpenChange={(open) => !open && setEditingFranchise(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Edit Franchise</DialogTitle>
          <FranchiseForm
            initialData={editingFranchise}
            onSubmit={(data) => {
              updateFranchise.mutate({ id: editingFranchise.id, ...data });
              setEditingFranchise(null);
            }}
            onCancel={() => setEditingFranchise(null)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Franchise Details Modal */}
      <FranchiseDetailsModal
        franchise={viewingFranchise}
        open={!!viewingFranchise}
        onOpenChange={(open) => !open && setViewingFranchise(null)}
      />
    </div>
  );
}