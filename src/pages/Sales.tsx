import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Loader2,
  TrendingUp,
  Coins,
  Gift,
  Calendar,
  Eye,
  Edit,
  Trash2
} from "lucide-react";
import { useSales, useDeleteSale, useUpdateSale } from "@/hooks/useSales";
import { EditSalesModal } from "@/components/EditSalesModal";
import { formatDate } from "@/lib/dateUtils";

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingSale, setViewingSale] = useState<any | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: sales, isLoading } = useSales();
  const deleteSale = useDeleteSale();
  const updateSale = useUpdateSale();

  const filteredSales = sales?.filter(sale =>
    sale.machines?.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.machines?.machine_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sale.franchises?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  const totalSalesAmount = sales?.reduce((sum, sale) => sum + sale.sales_amount, 0) || 0;
  const totalPrizeCost = sales?.reduce((sum, sale) => sum + sale.prize_out_cost, 0) || 0;
  const totalCoinSales = sales?.reduce((sum, sale) => sum + sale.coin_sales, 0) || 0;
  const totalPrizeOut = sales?.reduce((sum, sale) => sum + sale.prize_out_quantity, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Sales Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Track coin sales and prize distributions
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  ৳{totalSalesAmount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Sales</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {totalCoinSales.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Coins</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Gift className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {totalPrizeOut.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Prizes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  ৳{totalPrizeCost.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Prize Cost</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sales by machine name or franchise..."
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

      {/* Sales Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Machine</TableHead>
              <TableHead>Franchise</TableHead>
              <TableHead>Sales Date</TableHead>
              <TableHead>Coin Sales</TableHead>
              <TableHead>Sales Amount</TableHead>
              <TableHead>Prize Out</TableHead>
              <TableHead>Prize Cost</TableHead>
              <TableHead>Net Revenue</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((sale) => {
              const netRevenue = sale.sales_amount - sale.prize_out_cost;
              return (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Coins className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="font-medium">{sale.machines?.machine_name || 'Unknown Machine'}</div>
                        <div className="text-sm text-muted-foreground">{sale.machines?.machine_number}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{sale.franchises?.name || 'No Franchise'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(sale.sales_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-primary font-medium">
                    {sale.coin_sales.toLocaleString()} coins
                  </TableCell>
                  <TableCell className="text-success font-medium">
                    ৳{sale.sales_amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-accent font-medium">
                    {sale.prize_out_quantity.toLocaleString()} pcs
                  </TableCell>
                  <TableCell className="text-warning font-medium">
                    ৳{sale.prize_out_cost.toLocaleString()}
                  </TableCell>
                  <TableCell className={`font-medium ${netRevenue >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ৳{netRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingSale(sale)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingSale(sale)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this sales record?')) {
                            deleteSale.mutate(sale.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredSales.length)} of {filteredSales.length} results
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
      
      {/* Sales Details Modal */}
      {viewingSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setViewingSale(null)}>
          <Card className="bg-gradient-card border-border shadow-card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Sales Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Machine</div>
                  <div className="font-medium">{viewingSale.machines?.machine_name} - {viewingSale.machines?.machine_number}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Franchise</div>
                  <div className="font-medium">{viewingSale.franchises?.name}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Sales Date</div>
                  <div className="font-medium">{formatDate(viewingSale.sales_date)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(viewingSale.created_at)}</div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Sales Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Coin Sales</div>
                    <div className="text-lg font-semibold text-primary">{viewingSale.coin_sales.toLocaleString()} coins</div>
                    <div className="text-sm text-success">৳{viewingSale.sales_amount.toLocaleString()}</div>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="text-sm text-muted-foreground mb-1">Prize Out</div>
                    <div className="text-lg font-semibold text-accent">{viewingSale.prize_out_quantity.toLocaleString()} pcs</div>
                    <div className="text-sm text-warning">৳{viewingSale.prize_out_cost.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              {(viewingSale.coin_adjustment || viewingSale.prize_adjustment || viewingSale.adjustment_notes) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Adjustments</h4>
                  <div className="space-y-2">
                    {viewingSale.coin_adjustment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coin Adjustment:</span>
                        <span className="text-destructive">-{viewingSale.coin_adjustment} coins</span>
                      </div>
                    )}
                    {viewingSale.prize_adjustment && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prize Adjustment:</span>
                        <span className="text-destructive">-{viewingSale.prize_adjustment} pcs</span>
                      </div>
                    )}
                    {viewingSale.adjustment_notes && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Notes:</div>
                        <div className="text-sm bg-secondary/20 rounded p-2">{viewingSale.adjustment_notes}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Revenue:</span>
                  <span className={`text-lg font-bold ${(viewingSale.sales_amount - viewingSale.prize_out_cost) >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ৳{(viewingSale.sales_amount - viewingSale.prize_out_cost).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={() => setViewingSale(null)}>Close</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Edit Sales Modal */}
      {editingSale && (
        <EditSalesModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onUpdate={(data) => {
            updateSale.mutate({ id: editingSale.id, ...data });
            setEditingSale(null);
          }}
        />
      )}
    </div>
  );
}