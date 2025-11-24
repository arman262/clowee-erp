import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePrizeStock, useMachineWisePrizeStock } from "@/hooks/useInventory";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/numberUtils";
import { Package, TrendingUp, AlertTriangle, Plus, Edit, Trash2, ArrowUpDown, Search } from "lucide-react";
import { toast } from "sonner";

export default function Inventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: prizeStock } = usePrizeStock();
  const { data: machineWiseStock = [] } = useMachineWisePrizeStock();
  
  const { data: accessoriesData = [] } = useQuery({
    queryKey: ['accessories-inventory'],
    queryFn: async () => {
      const [expenses, categories, stockOut] = await Promise.all([
        db.from('machine_expenses').select().execute(),
        db.from('expense_categories').select().execute(),
        db.from('stock_out_history').select().execute()
      ]);
      
      const accessoryCategories = (categories || []).filter((cat: any) => 
        cat.category_name === 'Local Accessories' || cat.category_name === 'Import Accessories'
      );
      
      const accessoryCategoryIds = accessoryCategories.map((cat: any) => cat.id);
      const accessoryExpenses = (expenses || []).filter((exp: any) => 
        accessoryCategoryIds.includes(exp.category_id)
      );
      
      const stockInItems = (stockOut || []).filter((record: any) => record.adjustment_type === 'stock_in');
      
      const combinedData = [...accessoryExpenses.map((exp: any) => {
        const stockOutQuantity = (stockOut || []).filter((out: any) => out.item_id === exp.id)
          .reduce((sum: number, out: any) => sum + (out.quantity || 0), 0);
        
        const presentStock = exp.quantity - stockOutQuantity;
        const presentTotalAmount = presentStock * (exp.item_price || 0);
        
        return {
          ...exp,
          quantity: presentStock,
          total_amount: presentTotalAmount,
          category_name: accessoryCategories.find((cat: any) => cat.id === exp.category_id)?.category_name
        };
      }), ...stockInItems.map((item: any) => ({
        id: `stock_in_${item.id}`,
        expense_date: item.out_date,
        category_name: item.category,
        item_name: item.item_name,
        quantity: item.quantity,
        item_price: item.unit_price,
        total_amount: item.total_price
      }))];
      
      return combinedData;
    }
  });
  
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await db.from('machines').select().execute();
      return data || [];
    }
  });
  
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await db.from('users').select().execute();
      return data || [];
    }
  });
  
  const [showDollAdjustModal, setShowDollAdjustModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showEditStockOutModal, setShowEditStockOutModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [selectedStockOut, setSelectedStockOut] = useState<any>(null);
  const [accessoriesSearch, setAccessoriesSearch] = useState('');
  const [dollStockSearch, setDollStockSearch] = useState('');
  const [accessoriesPage, setAccessoriesPage] = useState(1);
  const [dollStockPage, setDollStockPage] = useState(1);
  const rowsPerPage = 50;

  const { data: stockOutHistory = [] } = useQuery({
    queryKey: ['stock-out-history'],
    queryFn: async () => {
      const data = await db.from('stock_out_history').select().execute();
      return (data || []).sort((a: any, b: any) => new Date(b.out_date).getTime() - new Date(a.out_date).getTime());
    }
  });

  const handleDeleteStockOut = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await db.from('stock_out_history').delete().eq('id', id).execute();
      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      queryClient.invalidateQueries({ queryKey: ['accessories-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['machine_wise_prize_stock'] });
      toast.success('Record deleted successfully');
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Manage stock, track items, and monitor inventory levels</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowStockInModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Stock In
          </Button>
          <Button onClick={() => setShowStockOutModal(true)} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Stock Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-glass border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">{prizeStock?.totalDollsInStock ?? 0}</div>
              <div className="text-sm text-muted-foreground">Total Dolls in Stock</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-glass border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{prizeStock?.totalPrizePurchase ?? 0}</div>
              <div className="text-sm text-muted-foreground">Total Doll Purchased</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-glass border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-destructive">{prizeStock?.totalPrizeOut ?? 0}</div>
              <div className="text-sm text-muted-foreground">Total Doll Sale(Prize Out)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Accessories Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item name or category..."
                value={accessoriesSearch}
                onChange={(e) => { setAccessoriesSearch(e.target.value); setAccessoriesPage(1); }}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Stock Quantity</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filtered = accessoriesData.filter((item: any) => 
                      item.item_name?.toLowerCase().includes(accessoriesSearch.toLowerCase()) ||
                      item.category_name?.toLowerCase().includes(accessoriesSearch.toLowerCase())
                    );
                    const paginated = filtered.slice((accessoriesPage - 1) * rowsPerPage, accessoriesPage * rowsPerPage);
                    const totalQty = filtered.reduce((sum, item) => sum + (item.quantity || 0), 0);
                    const totalAmount = filtered.reduce((sum, item) => sum + (item.total_amount || 0), 0);
                    
                    return (
                      <>
                        {paginated.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No accessories data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {paginated.map((item: any) => (
                              <TableRow key={item.id}>
                                <TableCell>{formatDate(item.expense_date)}</TableCell>
                                <TableCell>{item.category_name || '-'}</TableCell>
                                <TableCell>{item.item_name || '-'}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>৳{formatCurrency(item.item_price || 0)}</TableCell>
                                <TableCell className="font-bold">৳{formatCurrency(item.total_amount || 0)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-secondary/50 font-bold">
                              <TableCell colSpan={3} className="text-right">Total:</TableCell>
                              <TableCell>{totalQty}</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>৳{formatCurrency(totalAmount)}</TableCell>
                            </TableRow>
                          </>
                        )}
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-3">
              {(() => {
                const filtered = accessoriesData.filter((item: any) => 
                  item.item_name?.toLowerCase().includes(accessoriesSearch.toLowerCase()) ||
                  item.category_name?.toLowerCase().includes(accessoriesSearch.toLowerCase())
                );
                const paginated = filtered.slice((accessoriesPage - 1) * rowsPerPage, accessoriesPage * rowsPerPage);
                const totalQty = filtered.reduce((sum, item) => sum + (item.quantity || 0), 0);
                const totalAmount = filtered.reduce((sum, item) => sum + (item.total_amount || 0), 0);
                
                return (
                  <>
                    {paginated.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No accessories data available</div>
                    ) : (
                      <>
                        {paginated.map((item: any) => (
                          <Card key={item.id} className="bg-secondary/5 border-border">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">{item.item_name || '-'}</div>
                                <Badge variant="outline">{item.category_name || '-'}</Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">{formatDate(item.expense_date)}</div>
                              <div className="grid grid-cols-2 gap-2 text-sm pt-2">
                                <div>
                                  <div className="text-xs text-muted-foreground">Stock Qty</div>
                                  <div className="font-medium">{item.quantity}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Unit Price</div>
                                  <div className="font-medium">৳{formatCurrency(item.item_price || 0)}</div>
                                </div>
                              </div>
                              <div className="pt-2 border-t">
                                <div className="text-xs text-muted-foreground">Total Amount</div>
                                <div className="text-lg font-bold">৳{formatCurrency(item.total_amount || 0)}</div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Card className="bg-secondary/50 border-border">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-xs text-muted-foreground">Total Quantity</div>
                                <div className="text-lg font-bold">{totalQty}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Total Amount</div>
                                <div className="text-lg font-bold">৳{formatCurrency(totalAmount)}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            {(() => {
              const filtered = accessoriesData.filter((item: any) => 
                item.item_name?.toLowerCase().includes(accessoriesSearch.toLowerCase()) ||
                item.category_name?.toLowerCase().includes(accessoriesSearch.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / rowsPerPage);
              return totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((accessoriesPage - 1) * rowsPerPage) + 1} to {Math.min(accessoriesPage * rowsPerPage, filtered.length)} of {filtered.length}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAccessoriesPage(p => Math.max(1, p - 1))} disabled={accessoriesPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setAccessoriesPage(p => Math.min(totalPages, p + 1))} disabled={accessoriesPage === totalPages}>Next</Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border">
          <CardHeader>
            <CardTitle>Machine-Wise Doll Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by machine name..."
                value={dollStockSearch}
                onChange={(e) => { setDollStockSearch(e.target.value); setDollStockPage(1); }}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine Name</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead>Prize Out</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filtered = machineWiseStock.filter((machine: any) => 
                      (machine.machineName || '').toLowerCase().includes(dollStockSearch.toLowerCase())
                    );
                    const paginated = filtered.slice((dollStockPage - 1) * rowsPerPage, dollStockPage * rowsPerPage);
                    const totalPurchased = filtered.reduce((sum, m) => sum + (m.purchased || 0), 0);
                    const totalPrizeOut = filtered.reduce((sum, m) => sum + (m.prizeOut || 0), 0);
                    const totalStock = filtered.reduce((sum, m) => sum + (m.stock || 0), 0);
                    
                    return (
                      <>
                        {paginated.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                              No machine data available
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {paginated.map((machine: any) => (
                              <TableRow key={machine.machineId} className="h-10">
                                <TableCell className="font-medium py-2">{machine.machineName || ''}</TableCell>
                                <TableCell className="text-success py-2">{machine.purchased}</TableCell>
                                <TableCell className="text-destructive py-2">{machine.prizeOut}</TableCell>
                                <TableCell className="font-bold py-2">{machine.stock}</TableCell>
                                <TableCell className="py-2">
                                  <Button variant="outline" size="sm" onClick={() => { setSelectedMachine(machine); setShowDollAdjustModal(true); }} className="border-primary text-primary h-7">
                                    <ArrowUpDown className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-secondary/50 font-bold">
                              <TableCell className="text-right">Total:</TableCell>
                              <TableCell className="text-success">{totalPurchased}</TableCell>
                              <TableCell className="text-destructive">{totalPrizeOut}</TableCell>
                              <TableCell>{totalStock}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          </>
                        )}
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-3">
              {(() => {
                const filtered = machineWiseStock.filter((machine: any) => 
                  (machine.machineName || '').toLowerCase().includes(dollStockSearch.toLowerCase())
                );
                const paginated = filtered.slice((dollStockPage - 1) * rowsPerPage, dollStockPage * rowsPerPage);
                const totalPurchased = filtered.reduce((sum, m) => sum + (m.purchased || 0), 0);
                const totalPrizeOut = filtered.reduce((sum, m) => sum + (m.prizeOut || 0), 0);
                const totalStock = filtered.reduce((sum, m) => sum + (m.stock || 0), 0);
                
                return (
                  <>
                    {paginated.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No machine data available</div>
                    ) : (
                      <>
                        {paginated.map((machine: any) => (
                          <Card key={machine.machineId} className="bg-secondary/5 border-border">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="font-medium">{machine.machineName || ''}</div>
                                <Button variant="outline" size="sm" onClick={() => { setSelectedMachine(machine); setShowDollAdjustModal(true); }} className="border-primary text-primary">
                                  <ArrowUpDown className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <div className="text-xs text-muted-foreground">Purchased</div>
                                  <div className="font-medium text-success">{machine.purchased}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Prize Out</div>
                                  <div className="font-medium text-destructive">{machine.prizeOut}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground">Stock</div>
                                  <div className="font-bold">{machine.stock}</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Card className="bg-secondary/50 border-border">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground">Total Purchased</div>
                                <div className="font-bold text-success">{totalPurchased}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Total Prize Out</div>
                                <div className="font-bold text-destructive">{totalPrizeOut}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">Total Stock</div>
                                <div className="font-bold">{totalStock}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            {(() => {
              const filtered = machineWiseStock.filter((machine: any) => 
                (machine.machineName || '').toLowerCase().includes(dollStockSearch.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / rowsPerPage);
              return totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((dollStockPage - 1) * rowsPerPage) + 1} to {Math.min(dollStockPage * rowsPerPage, filtered.length)} of {filtered.length}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDollStockPage(p => Math.max(1, p - 1))} disabled={dollStockPage === 1}>Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setDollStockPage(p => Math.min(totalPages, p + 1))} disabled={dollStockPage === totalPages}>Next</Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

            <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Stock Out History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Machine</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Handled By</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockOutHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No stock out history
                    </TableCell>
                  </TableRow>
                ) : (
                  stockOutHistory.map((record: any) => {
                    const itemName = record.adjustment_type === 'stock_in' ? record.item_name : (accessoriesData.find((item: any) => item.id === record.item_id)?.item_name || '-');
                    const machineName = machines.find((m: any) => m.id === record.machine_id)?.machine_name || '-';
                    const user = users.find((u: any) => u.id === record.handled_by);
                    const userName = user?.first_name || (record.handled_by && typeof record.handled_by === 'string' && !record.handled_by.includes('-') ? record.handled_by : '-');
                    const getTypeBadge = () => {
                      if (record.adjustment_type === 'doll_add') {
                        return <Badge className="bg-blue-500">Doll Add</Badge>;
                      } else if (record.adjustment_type === 'doll_deduct') {
                        return <Badge className="bg-red-500">Doll Deduct</Badge>;
                      } else if (record.adjustment_type === 'stock_in') {
                        return <Badge className="bg-green-500">Stock In</Badge>;
                      }
                      return <Badge className="bg-red-500">Stock Out</Badge>;
                    };
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{formatDate(record.out_date)}</TableCell>
                        <TableCell>{getTypeBadge()}</TableCell>
                        <TableCell>{machineName}</TableCell>
                        <TableCell>{itemName}</TableCell>
                        <TableCell className="font-bold">{record.quantity}</TableCell>
                        <TableCell>{userName}</TableCell>
                        <TableCell>{record.remarks || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setSelectedStockOut(record); setShowEditStockOutModal(true); }}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteStockOut(record.id)} className="border-destructive text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {stockOutHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No stock out history</div>
            ) : (
              stockOutHistory.map((record: any) => {
                const itemName = record.adjustment_type === 'stock_in' ? record.item_name : (accessoriesData.find((item: any) => item.id === record.item_id)?.item_name || '-');
                const machineName = machines.find((m: any) => m.id === record.machine_id)?.machine_name || '-';
                const user = users.find((u: any) => u.id === record.handled_by);
                const userName = user?.first_name || (record.handled_by && typeof record.handled_by === 'string' && !record.handled_by.includes('-') ? record.handled_by : '-');
                const getTypeBadge = () => {
                  if (record.adjustment_type === 'doll_add') {
                    return <Badge className="bg-blue-500">Doll Add</Badge>;
                  } else if (record.adjustment_type === 'doll_deduct') {
                    return <Badge className="bg-red-500">Doll Deduct</Badge>;
                  } else if (record.adjustment_type === 'stock_in') {
                    return <Badge className="bg-green-500">Stock In</Badge>;
                  }
                  return <Badge className="bg-red-500">Stock Out</Badge>;
                };
                return (
                  <Card key={record.id} className="bg-secondary/5 border-border">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{itemName}</div>
                          <div className="text-xs text-muted-foreground">{formatDate(record.out_date)}</div>
                        </div>
                        {getTypeBadge()}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground">Machine</div>
                          <div>{machineName}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Quantity</div>
                          <div className="font-bold">{record.quantity}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Handled By</div>
                          <div>{userName}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Remarks</div>
                          <div className="truncate" title={record.remarks || '-'}>{record.remarks || '-'}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setSelectedStockOut(record); setShowEditStockOutModal(true); }}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 border-destructive text-destructive" onClick={() => handleDeleteStockOut(record.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
      <AdjustDollStockModal open={showDollAdjustModal} onClose={() => setShowDollAdjustModal(false)} machine={selectedMachine} />
      <StockInModal open={showStockInModal} onClose={() => setShowStockInModal(false)} />
      <StockOutModal open={showStockOutModal} onClose={() => setShowStockOutModal(false)} accessoriesData={accessoriesData} machines={machines || []} />
      <EditStockOutModal open={showEditStockOutModal} onClose={() => setShowEditStockOutModal(false)} stockOut={selectedStockOut} accessoriesData={accessoriesData} machines={machines || []} />
    </div>
  );
}

function AdjustDollStockModal({ open, onClose, machine }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');
  
  if (!machine) return null;
  
  const handleAdjust = async () => {
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      await db.from('stock_out_history').insert({
        out_date: new Date().toISOString().split('T')[0],
        machine_id: machine.machineId,
        item_id: null,
        quantity: adjustType === 'add' ? quantity : -quantity,
        remarks: remarks,
        handled_by: user?.name || user?.email || null,
        adjustment_type: adjustType === 'add' ? 'doll_add' : 'doll_deduct'
      }).select().single();

      queryClient.invalidateQueries({ queryKey: ['machine_wise_prize_stock'] });
      queryClient.invalidateQueries({ queryKey: ['prize_stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      
      setQuantity(0);
      setRemarks('');
      onClose();
      toast.success(`Successfully ${adjustType === 'add' ? 'added' : 'deducted'} ${quantity} dolls`);
    } catch (error: any) {
      toast.error(`Failed to adjust stock: ${error.message || 'Unknown error'}`);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Doll Stock - {machine.machineName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Current Stock: {machine.stock} dolls</Label>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'deduct')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Doll Stock</SelectItem>
                <SelectItem value="deduct">Deduct Doll Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdjust} className="bg-gradient-primary">Adjust Stock</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StockOutModal({ open, onClose, accessoriesData, machines }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineId, setMachineId] = useState('none');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');

  const handleSubmit = async () => {
    if (!selectedItemId || quantity <= 0) {
      toast.error('Please select an item and enter quantity');
      return;
    }

    try {
      await db.from('stock_out_history').insert({
        out_date: date,
        machine_id: machineId !== 'none' ? machineId : null,
        item_id: selectedItemId,
        quantity: quantity,
        remarks: remarks,
        handled_by: user?.name || user?.email || null
      }).select().single();

      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      queryClient.invalidateQueries({ queryKey: ['accessories-inventory'] });
      setDate(new Date().toISOString().split('T')[0]);
      setMachineId('none');
      setSelectedItemId('');
      setQuantity(0);
      setRemarks('');
      onClose();
      toast.success('Stock out recorded successfully');
    } catch (error: any) {
      toast.error(`Failed to record stock out: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock Out</DialogTitle>
          <DialogDescription>Record stock out from accessories inventory.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Machine (Optional)</Label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {machines.map((machine: any) => (
                  <SelectItem key={machine.id} value={machine.id}>{machine.machine_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Item Name *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent>
                {accessoriesData.map((item: any) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_name} (Available: {item.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity *</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-gradient-primary">Submit</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StockInModal({ open, onClose }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    setTotalPrice(quantity * unitPrice);
  }, [quantity, unitPrice]);

  const handleSubmit = async () => {
    if (!category || !itemName || quantity <= 0 || unitPrice <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await db.from('stock_out_history').insert({
        out_date: date,
        machine_id: null,
        item_id: null,
        quantity: quantity,
        category: category,
        item_name: itemName,
        unit_price: unitPrice,
        total_price: totalPrice,
        remarks: 'Stock In',
        handled_by: user?.name || user?.email || null,
        adjustment_type: 'stock_in'
      }).select().single();

      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      queryClient.invalidateQueries({ queryKey: ['accessories-inventory'] });
      
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('');
      setItemName('');
      setQuantity(0);
      setUnitPrice(0);
      setTotalPrice(0);
      onClose();
      toast.success('Stock in recorded successfully');
    } catch (error: any) {
      toast.error(`Failed to record stock in: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock In</DialogTitle>
          <DialogDescription>Add new stock to accessories inventory.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Import Accessories">Import Accessories</SelectItem>
                <SelectItem value="Local Accessories">Local Accessories</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Item Name *</Label>
            <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Enter item name" />
          </div>
          <div>
            <Label>Stock Quantity *</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div>
            <Label>Unit Price *</Label>
            <Input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
          </div>
          <div>
            <Label>Total Price</Label>
            <Input value={`৳${totalPrice.toFixed(2)}`} disabled className="bg-secondary" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditStockOutModal({ open, onClose, stockOut, accessoriesData, machines }: any) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineId, setMachineId] = useState('none');
  const [quantity, setQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [category, setCategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [unitPrice, setUnitPrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (stockOut) {
      setDate(stockOut.out_date || new Date().toISOString().split('T')[0]);
      setMachineId(stockOut.machine_id || 'none');
      setQuantity(stockOut.quantity || 0);
      setRemarks(stockOut.remarks || '');
      setCategory(stockOut.category || '');
      setItemName(stockOut.item_name || '');
      setUnitPrice(stockOut.unit_price || 0);
      setTotalPrice(stockOut.total_price || 0);
    }
  }, [stockOut]);

  useEffect(() => {
    if (stockOut?.adjustment_type === 'stock_in') {
      setTotalPrice(quantity * unitPrice);
    }
  }, [quantity, unitPrice, stockOut?.adjustment_type]);

  const handleUpdate = async () => {
    if (!stockOut || quantity <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    try {
      const updateData: any = {
        out_date: date,
        machine_id: machineId !== 'none' ? machineId : null,
        quantity,
        remarks
      };

      if (stockOut.adjustment_type === 'stock_in') {
        updateData.category = category;
        updateData.item_name = itemName;
        updateData.unit_price = unitPrice;
        updateData.total_price = totalPrice;
      }

      await db.from('stock_out_history')
        .update(updateData)
        .eq('id', stockOut.id)
        .select().single();

      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      queryClient.invalidateQueries({ queryKey: ['accessories-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['machine_wise_prize_stock'] });
      onClose();
      toast.success('Record updated successfully');
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  if (!stockOut) return null;

  const displayItemName = stockOut.adjustment_type === 'stock_in' ? stockOut.item_name : (accessoriesData.find((item: any) => item.id === stockOut.item_id)?.item_name || '-');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {stockOut.adjustment_type === 'stock_in' ? 'Stock In' : 'Stock Out'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Machine (Optional)</Label>
            <Select value={machineId || 'none'} onValueChange={setMachineId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {machines.map((machine: any) => (
                  <SelectItem key={machine.id} value={machine.id}>{machine.machine_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {stockOut.adjustment_type === 'stock_in' ? (
            <>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Import Accessories">Import Accessories</SelectItem>
                    <SelectItem value="Local Accessories">Local Accessories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Item Name</Label>
                <Input value={itemName} onChange={(e) => setItemName(e.target.value)} />
              </div>
              <div>
                <Label>Unit Price</Label>
                <Input type="number" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} />
              </div>
              <div>
                <Label>Total Price</Label>
                <Input value={`৳${totalPrice.toFixed(2)}`} disabled className="bg-secondary" />
              </div>
            </>
          ) : (
            <div>
              <Label>Item Name</Label>
              <Input value={displayItemName} disabled />
            </div>
          )}
          <div>
            <Label>Quantity *</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpdate} className="bg-gradient-primary">Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


