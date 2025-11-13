import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useInventoryItems, useInventoryLogs, useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem, useStockAdjustment, useDeleteInventoryLog, usePrizeStock, useMachineWisePrizeStock } from "@/hooks/useInventory";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/numberUtils";
import { Package, TrendingUp, AlertTriangle, Layers, DollarSign, Plus, Search, Download, FileText, Edit, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { TablePager } from "@/components/TablePager";
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Inventory() {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: logs = [] } = useInventoryLogs();
  const { data: prizeStock } = usePrizeStock();
  const { data: machineWiseStock = [] } = useMachineWisePrizeStock();
  
  const { data: accessoriesData = [] } = useQuery({
    queryKey: ['accessories-inventory'],
    queryFn: async () => {
      const [expenses, categories] = await Promise.all([
        db.from('machine_expenses').select().execute(),
        db.from('expense_categories').select().execute()
      ]);
      
      const accessoryCategories = (categories || []).filter((cat: any) => 
        cat.category_name === 'Local Accessories' || cat.category_name === 'Import Accessories'
      );
      
      const accessoryCategoryIds = accessoryCategories.map((cat: any) => cat.id);
      
      return (expenses || []).filter((exp: any) => 
        accessoryCategoryIds.includes(exp.category_id)
      ).map((exp: any) => ({
        ...exp,
        category_name: accessoryCategories.find((cat: any) => cat.id === exp.category_id)?.category_name
      }));
    }
  });
  
  console.log('machineWiseStock in component:', machineWiseStock);
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const adjustStock = useStockAdjustment();
  const deleteLog = useDeleteInventoryLog();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDollAdjustModal, setShowDollAdjustModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    quantity: 0,
    unit: "pcs",
    purchase_price: 0,
    selling_price: 0,
    supplier: "",
    date_of_entry: new Date().toISOString().split('T')[0],
    remarks: "",
    low_stock_threshold: 10,
    item_type: "manual" as "manual" | "prize" | "accessory"
  });

  const [adjustData, setAdjustData] = useState({
    type: "add" as "add" | "deduct",
    quantity: 0,
    remarks: ""
  });

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  
  const getStatus = (item: any) => {
    if (item.quantity === 0) return "Out of Stock";
    if (item.quantity <= (item.low_stock_threshold || 10)) return "Low Stock";
    return "In Stock";
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const status = getStatus(item);
    const matchesStatus = filterStatus === "all" || status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    totalItems: items.length,
    inStock: items.filter(i => i.quantity > (i.low_stock_threshold || 10)).length,
    lowStock: items.filter(i => i.quantity > 0 && i.quantity <= (i.low_stock_threshold || 10)).length,
    totalCategories: categories.length,
    totalValue: items.reduce((sum, i) => sum + (i.quantity * (i.purchase_price || 0)), 0)
  };

  const paginatedItems = filteredItems.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSubmit = () => {
    if (showEditModal && selectedItem) {
      updateItem.mutate({ id: selectedItem.id, ...formData });
      setShowEditModal(false);
    } else {
      createItem.mutate(formData);
      setShowAddModal(false);
    }
    resetForm();
  };

  const handleAdjust = () => {
    if (selectedItem) {
      adjustStock.mutate({
        itemId: selectedItem.id,
        type: adjustData.type,
        quantity: adjustData.quantity,
        remarks: adjustData.remarks,
        handledBy: user?.name
      });
      setShowAdjustModal(false);
      setAdjustData({ type: "add", quantity: 0, remarks: "" });
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: "",
      category: "",
      quantity: 0,
      unit: "pcs",
      purchase_price: 0,
      selling_price: 0,
      supplier: "",
      date_of_entry: new Date().toISOString().split('T')[0],
      remarks: "",
      low_stock_threshold: 10,
      item_type: "manual"
    });
  };

  const handleExportExcel = () => {
    const exportData = filteredItems.map(item => ({
      'Item Name': item.item_name,
      'Category': item.category || '',
      'Quantity': item.quantity,
      'Unit': item.unit || 'pcs',
      'Purchase Price': item.purchase_price || 0,
      'Selling Price': item.selling_price || 0,
      'Stock Value': (item.quantity * (item.purchase_price || 0)).toFixed(2),
      'Supplier': item.supplier || '',
      'Status': getStatus(item),
      'Last Updated': formatDate(item.updated_at || item.created_at)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Inventory Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    const tableData = filteredItems.map(item => [
      item.item_name,
      item.category || '',
      item.quantity,
      item.unit || 'pcs',
      formatCurrency(item.purchase_price),
      formatCurrency(item.selling_price),
      getStatus(item)
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Item', 'Category', 'Qty', 'Unit', 'Purchase', 'Selling', 'Status']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 }
    });

    doc.save(`Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Manage stock, track items, and monitor inventory levels</p>
        </div>
        <Button onClick={() => { resetForm(); setShowAddModal(true); }} className="bg-gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-glass border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">{prizeStock?.totalDollsInStock ?? 0}</div>
              <div className="text-sm text-muted-foreground">Total Dolls in Stock</div>
              {/* <div className="text-xs mt-1">In: {prizeStock?.totalPrizePurchase ?? 0} | Out: {prizeStock?.totalPrizeOut ?? 0}</div> */}
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

        <Card className="bg-gradient-glass border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-glass border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">৳{formatCurrency(stats.totalValue)}</div>
              <div className="text-sm text-muted-foreground">Stock Value</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search items..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="In Stock">In Stock</SelectItem>
                <SelectItem value="Low Stock">Low Stock</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportExcel} className="border-success text-success">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="border-success text-success">
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <TablePager totalRows={filteredItems.length} rowsPerPage={rowsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onRowsPerPageChange={setRowsPerPage} />

      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Accessories Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Stock Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!accessoriesData || accessoriesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No accessories data available
                    </TableCell>
                  </TableRow>
                ) : (
                  accessoriesData.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.expense_date)}</TableCell>
                      <TableCell>{item.item_name || '-'}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>৳{formatCurrency(item.item_price || 0)}</TableCell>
                      <TableCell className="font-bold">৳{formatCurrency(item.total_amount || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Machine-Wise Doll Stock</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                {!machineWiseStock || machineWiseStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      No machine data available
                    </TableCell>
                  </TableRow>
                ) : (
                  machineWiseStock.map((machine: any) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle>Inventory Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity Changed</TableHead>
                  <TableHead>Remaining Stock</TableHead>
                  <TableHead>Handled By</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.slice(0, 50).map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                    <TableCell>{log.inventory_items?.item_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={log.type === 'add' ? 'bg-success' : 'bg-warning'}>
                        {log.type === 'add' ? 'Add' : 'Deduct'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{log.quantity}</TableCell>
                    <TableCell>{log.remaining_stock}</TableCell>
                    <TableCell>{log.users?.name || log.handled_by || '-'}</TableCell>
                    <TableCell>{log.remarks || '-'}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => confirm('Delete this log?') && deleteLog.mutate(log.id)} className="border-destructive text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ItemFormModal open={showAddModal || showEditModal} onClose={() => { setShowAddModal(false); setShowEditModal(false); }} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} isEdit={showEditModal} />
      <AdjustStockModal open={showAdjustModal} onClose={() => setShowAdjustModal(false)} item={selectedItem} adjustData={adjustData} setAdjustData={setAdjustData} onSubmit={handleAdjust} />
      <AdjustDollStockModal open={showDollAdjustModal} onClose={() => setShowDollAdjustModal(false)} machine={selectedMachine} />
      <ViewItemModal open={showViewModal} onClose={() => setShowViewModal(false)} item={selectedItem} />
    </div>
  );
}

function ItemFormModal({ open, onClose, formData, setFormData, onSubmit, isEdit }: any) {
  const [showAccessoryFields, setShowAccessoryFields] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Item Type *</Label>
            <Select 
              value={formData.item_type || "manual"} 
              onValueChange={(v) => {
                setFormData({ ...formData, item_type: v });
                setShowAccessoryFields(v === "accessory");
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="accessory">Accessory (Import/Local)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showAccessoryFields && (
            <div className="col-span-2">
              <Label>Accessory Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Import Accessories">Import Accessories</SelectItem>
                  <SelectItem value="Local Accessories">Local Accessories</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Item Name *</Label>
            <Input value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} />
          </div>
          {!showAccessoryFields && (
            <div>
              <Label>Category</Label>
              <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
            </div>
          )}
          <div>
            <Label>Quantity *</Label>
            <Input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pieces</SelectItem>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="kg">Kilogram</SelectItem>
                <SelectItem value="ltr">Liter</SelectItem>
                <SelectItem value="pack">Pack</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Purchase Price</Label>
            <Input type="number" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Selling Price</Label>
            <Input type="number" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Supplier</Label>
            <Input value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} />
          </div>
          <div>
            <Label>Date of Entry</Label>
            <Input type="date" value={formData.date_of_entry} onChange={(e) => setFormData({ ...formData, date_of_entry: e.target.value })} />
          </div>
          <div>
            <Label>Low Stock Threshold</Label>
            <Input type="number" value={formData.low_stock_threshold} onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })} />
          </div>
          <div className="col-span-2">
            <Label>Remarks</Label>
            <Textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} className="bg-gradient-primary">{isEdit ? 'Update' : 'Add'} Item</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockModal({ open, onClose, item, adjustData, setAdjustData, onSubmit }: any) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock - {item?.item_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Current Stock: {item?.quantity} {item?.unit || 'pcs'}</Label>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={adjustData.type} onValueChange={(v) => setAdjustData({ ...adjustData, type: v as 'add' | 'deduct' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Stock</SelectItem>
                <SelectItem value="deduct">Deduct Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" value={adjustData.quantity} onChange={(e) => setAdjustData({ ...adjustData, quantity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Textarea value={adjustData.remarks} onChange={(e) => setAdjustData({ ...adjustData, remarks: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} className="bg-gradient-primary">Adjust Stock</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewItemModal({ open, onClose, item }: any) {
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Item Details</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Item Name</Label><div className="font-medium">{item.item_name}</div></div>
          <div><Label>Category</Label><div className="font-medium">{item.category || '-'}</div></div>
          <div><Label>Quantity</Label><div className="font-bold text-lg">{item.quantity} {item.unit || 'pcs'}</div></div>
          <div><Label>Stock Value</Label><div className="font-bold text-lg text-success">৳{formatCurrency(item.quantity * (item.purchase_price || 0))}</div></div>
          <div><Label>Purchase Price</Label><div>৳{formatCurrency(item.purchase_price)}</div></div>
          <div><Label>Selling Price</Label><div>৳{formatCurrency(item.selling_price)}</div></div>
          <div><Label>Supplier</Label><div>{item.supplier || '-'}</div></div>
          <div><Label>Date of Entry</Label><div>{formatDate(item.date_of_entry)}</div></div>
          <div><Label>Low Stock Threshold</Label><div>{item.low_stock_threshold || 10}</div></div>
          <div><Label>Last Updated</Label><div>{formatDate(item.updated_at || item.created_at)}</div></div>
          {item.remarks && <div className="col-span-2"><Label>Remarks</Label><div className="bg-secondary/20 p-2 rounded">{item.remarks}</div></div>}
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDollStockModal({ open, onClose, machine }: any) {
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState(0);
  const [remarks, setRemarks] = useState('');
  
  if (!machine) return null;
  
  const handleAdjust = () => {
    alert(`Adjust ${adjustType} ${quantity} dolls for ${machine.machineName}. Remarks: ${remarks}`);
    onClose();
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
                <SelectItem value="add">Add Stock</SelectItem>
                <SelectItem value="deduct">Deduct Stock</SelectItem>
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
