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
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

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
      
      return accessoryExpenses.map((exp: any) => {
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
      });
    }
  });
  
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await db.from('machines').select().execute();
      return data || [];
    }
  });
  
  const [showDollAdjustModal, setShowDollAdjustModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showEditStockOutModal, setShowEditStockOutModal] = useState(false);
  const [deletingStockOut, setDeletingStockOut] = useState<any>(null);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [selectedStockOut, setSelectedStockOut] = useState<any>(null);
  const [accessoriesSearch, setAccessoriesSearch] = useState('');
  const [dollStockSearch, setDollStockSearch] = useState('');
  const [stockOutSearch, setStockOutSearch] = useState('');
  const [accessoriesPage, setAccessoriesPage] = useState(1);
  const [dollStockPage, setDollStockPage] = useState(1);
  const [stockOutPage, setStockOutPage] = useState(1);
  const rowsPerPage = 50;

  const { data: stockOutHistory = [] } = useQuery({
    queryKey: ['stock-out-history'],
    queryFn: async () => {
      const data = await db.from('stock_out_history').select().execute();
      return (data || []).sort((a: any, b: any) => new Date(b.out_date).getTime() - new Date(a.out_date).getTime());
    }
  });

  const handleDeleteStockOut = async () => {
    if (!deletingStockOut) return;
    try {
      await db.from('stock_out_history').delete().eq('id', deletingStockOut.id).execute();
      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      queryClient.invalidateQueries({ queryKey: ['accessories-inventory'] });
      toast.success('Record deleted successfully');
      setDeletingStockOut(null);
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
        <Button onClick={() => setShowStockOutModal(true)} className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Stock Out
        </Button>
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

      <div className="grid grid-cols-2 gap-6">
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
            <div className="overflow-x-auto">
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
            <div className="overflow-x-auto">
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
                      machine.machineName?.toLowerCase().includes(dollStockSearch.toLowerCase())
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
                              <TableRow key={machine.machineId}>
                                <TableCell className="font-medium">{machine.machineName}</TableCell>
                                <TableCell className="text-success">{machine.purchased}</TableCell>
                                <TableCell className="text-destructive">{machine.prizeOut}</TableCell>
                                <TableCell className="font-bold">{machine.stock}</TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm" onClick={() => { setSelectedMachine(machine); setShowDollAdjustModal(true); }} className="border-primary text-primary">
                                    <ArrowUpDown className="h-4 w-4" />
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
            {(() => {
              const filtered = machineWiseStock.filter((machine: any) => 
                machine.machineName?.toLowerCase().includes(dollStockSearch.toLowerCase())
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
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by machine, item, or type..."
              value={stockOutSearch}
              onChange={(e) => { setStockOutSearch(e.target.value); setStockOutPage(1); }}
              className="pl-10 bg-secondary/30 border-border"
            />
          </div>
          <div className="overflow-x-auto">
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
                {(() => {
                  const filtered = stockOutHistory.filter((record: any) => {
                    const itemName = record.item_id ? (accessoriesData.find((item: any) => item.id === record.item_id)?.item_name || '') : 'Doll Stock';
                    const machineName = machines.find((m: any) => m.id === record.machine_id)?.machine_name || '';
                    const type = record.adjustment_type === 'doll_add' ? 'Doll Add' : record.adjustment_type === 'doll_deduct' ? 'Doll Deduct' : 'Stock Out';
                    return machineName.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                           itemName.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                           type.toLowerCase().includes(stockOutSearch.toLowerCase());
                  });
                  const paginated = filtered.slice((stockOutPage - 1) * rowsPerPage, stockOutPage * rowsPerPage);
                  
                  return (
                    <>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No stock out history
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginated.map((record: any) => {
                          const itemName = record.item_id ? (accessoriesData.find((item: any) => item.id === record.item_id)?.item_name || '-') : 'Doll Stock';
                          const machineName = machines.find((m: any) => m.id === record.machine_id)?.machine_name || '-';
                          const type = record.adjustment_type === 'doll_add' ? 'Doll Add' : record.adjustment_type === 'doll_deduct' ? 'Doll Deduct' : 'Stock Out';
                          return (
                            <TableRow key={record.id}>
                              <TableCell>{formatDate(record.out_date)}</TableCell>
                              <TableCell><Badge className={record.adjustment_type?.includes('doll') ? 'bg-blue-500' : 'bg-warning'}>{type}</Badge></TableCell>
                              <TableCell>{machineName}</TableCell>
                              <TableCell>{itemName}</TableCell>
                              <TableCell className="font-bold">{Math.abs(record.quantity)}</TableCell>
                              <TableCell>{record.handled_by || '-'}</TableCell>
                              <TableCell>{record.remarks || '-'}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => { setSelectedStockOut(record); setShowEditStockOutModal(true); }}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setDeletingStockOut(record)} className="border-destructive text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </>
                  );
                })()}
              </TableBody>
            </Table>
          </div>
          {(() => {
            const filtered = stockOutHistory.filter((record: any) => {
              const itemName = record.item_id ? (accessoriesData.find((item: any) => item.id === record.item_id)?.item_name || '') : 'Doll Stock';
              const machineName = machines.find((m: any) => m.id === record.machine_id)?.machine_name || '';
              const type = record.adjustment_type === 'doll_add' ? 'Doll Add' : record.adjustment_type === 'doll_deduct' ? 'Doll Deduct' : 'Stock Out';
              return machineName.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                     itemName.toLowerCase().includes(stockOutSearch.toLowerCase()) ||
                     type.toLowerCase().includes(stockOutSearch.toLowerCase());
            });
            const totalPages = Math.ceil(filtered.length / rowsPerPage);
            return totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((stockOutPage - 1) * rowsPerPage) + 1} to {Math.min(stockOutPage * rowsPerPage, filtered.length)} of {filtered.length}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStockOutPage(p => Math.max(1, p - 1))} disabled={stockOutPage === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setStockOutPage(p => Math.min(totalPages, p + 1))} disabled={stockOutPage === totalPages}>Next</Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <AdjustDollStockModal open={showDollAdjustModal} onClose={() => setShowDollAdjustModal(false)} machine={selectedMachine} />
      <StockOutModal open={showStockOutModal} onClose={() => setShowStockOutModal(false)} accessoriesData={accessoriesData} machines={machines || []} />
      <EditStockOutModal open={showEditStockOutModal} onClose={() => setShowEditStockOutModal(false)} stockOut={selectedStockOut} accessoriesData={accessoriesData} machines={machines || []} />
      
      <DeleteConfirmDialog
        open={!!deletingStockOut}
        onOpenChange={(open) => !open && setDeletingStockOut(null)}
        onConfirm={handleDeleteStockOut}
        title="Delete Stock Out Record"
        description="Are you sure you want to delete this record?"
        details={[
          { label: "Date", value: deletingStockOut ? formatDate(deletingStockOut.out_date) : '' },
          { label: "Type", value: deletingStockOut?.adjustment_type === 'doll_add' ? 'Doll Add' : deletingStockOut?.adjustment_type === 'doll_deduct' ? 'Doll Deduct' : 'Stock Out' },
          { label: "Machine", value: deletingStockOut ? (machines.find((m: any) => m.id === deletingStockOut.machine_id)?.machine_name || '-') : '' },
          { label: "Item", value: deletingStockOut?.item_id ? (accessoriesData.find((item: any) => item.id === deletingStockOut.item_id)?.item_name || '-') : 'Doll Stock' },
          { label: "Quantity", value: deletingStockOut ? Math.abs(deletingStockOut.quantity) : 0 }
        ]}
      />
    </div>
  );
}

function AdjustDollStockModal({ open, onClose, machine }: any) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  if (!machine) return null;
  
  const handleAdjust = async () => {
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      // Save to stock_out_history table with adjustment_type field
      await db.from('stock_out_history').insert({
        out_date: date,
        machine_id: machine.machineId,
        item_id: null,
        quantity: adjustType === 'add' ? -quantity : quantity,
        remarks: `${adjustType === 'add' ? 'Add' : 'Deduct'} Doll Stock: ${remarks}`,
        handled_by: user?.name || 'System',
        adjustment_type: adjustType === 'add' ? 'doll_add' : 'doll_deduct'
      }).select().single();

      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      toast.success('Doll stock adjusted successfully');
      setQuantity(0);
      setRemarks('');
      setDate(new Date().toISOString().split('T')[0]);
      onClose();
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
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
        handled_by: user?.name || 'System'
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
                {accessoriesData.filter((item: any) => item.quantity > 0).map((item: any) => (
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

function EditStockOutModal({ open, onClose, stockOut, accessoriesData, machines }: any) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineId, setMachineId] = useState('none');
  const [quantity, setQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (stockOut) {
      setDate(stockOut.out_date || new Date().toISOString().split('T')[0]);
      setMachineId(stockOut.machine_id || 'none');
      setQuantity(Math.abs(stockOut.quantity) || 0);
      setRemarks(stockOut.remarks || '');
    }
  }, [stockOut]);

  const handleUpdate = async () => {
    if (!stockOut || quantity <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    try {
      const isDollAdjustment = stockOut.adjustment_type?.includes('doll');
      const finalQuantity = isDollAdjustment && stockOut.adjustment_type === 'doll_add' ? -quantity : quantity;
      
      await db.from('stock_out_history')
        .update({ out_date: date, machine_id: machineId !== 'none' ? machineId : null, quantity: finalQuantity, remarks })
        .eq('id', stockOut.id)
        .select().single();

      queryClient.invalidateQueries({ queryKey: ['stock-out-history'] });
      queryClient.invalidateQueries({ queryKey: ['accessories-inventory'] });
      onClose();
      toast.success('Record updated successfully');
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  if (!stockOut) return null;

  const isDollAdjustment = stockOut.adjustment_type?.includes('doll');
  const itemName = isDollAdjustment ? 'Doll Stock Adjustment' : (accessoriesData.find((item: any) => item.id === stockOut.item_id)?.item_name || '-');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Stock Out</DialogTitle>
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
          <div>
            <Label>Item Name</Label>
            <Input value={itemName} disabled />
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
          <Button onClick={handleUpdate} className="bg-gradient-primary">Update</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


