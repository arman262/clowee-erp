import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Landmark, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { BankForm } from "@/components/forms/BankForm";
import { useBanks, useCreateBank, useUpdateBank, useDeleteBank } from "@/hooks/useBanks";
import { useBankMoneyLogs, useCreateBankMoneyLog, useUpdateBankMoneyLog, useDeleteBankMoneyLog } from "@/hooks/useBankMoneyLogs";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { useMachineExpenses } from "@/hooks/useMachineExpenses";
import { TablePager } from "@/components/TablePager";
import { usePagination } from "@/hooks/usePagination";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/numberUtils";

export default function Banks() {
  const { canEdit } = usePermissions();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false);
  const [viewingBank, setViewingBank] = useState<any | null>(null);
  const [editingBank, setEditingBank] = useState<any | null>(null);
  const [deletingBank, setDeletingBank] = useState<any | null>(null);
  const [viewingMoneyLog, setViewingMoneyLog] = useState<any | null>(null);
  const [editingMoneyLog, setEditingMoneyLog] = useState<any | null>(null);
  const [deletingMoneyLog, setDeletingMoneyLog] = useState<any | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [moneyFormData, setMoneyFormData] = useState({
    action_type: 'add',
    bank_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    remarks: ''
  });

  const { data: banks, isLoading } = useBanks();
  const { data: moneyLogs } = useBankMoneyLogs();
  const { data: payments } = useMachinePayments();
  const { data: expenses } = useMachineExpenses();
  const createBank = useCreateBank();
  const updateBank = useUpdateBank();
  const deleteBank = useDeleteBank();
  const createMoneyLog = useCreateBankMoneyLog();
  const updateMoneyLog = useUpdateBankMoneyLog();
  const deleteMoneyLog = useDeleteBankMoneyLog();

  const calculateBankBalance = (bankId: string) => {
    let balance = 0;
    
    // Add money logs (add/deduct)
    if (moneyLogs && moneyLogs.length > 0) {
      balance += moneyLogs
        .filter((log: any) => log.bank_id === bankId)
        .reduce((sum: number, log: any) => {
          const amount = Number(log.amount) || 0;
          return log.action_type === 'add' ? sum + amount : sum - amount;
        }, 0);
    }
    
    // Add payments received
    if (payments && payments.length > 0) {
      balance += payments
        .filter((payment: any) => payment.bank_id === bankId)
        .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    }
    
    // Subtract expenses
    if (expenses && expenses.length > 0) {
      balance -= expenses
        .filter((expense: any) => expense.bank_id === bankId)
        .reduce((sum: number, expense: any) => sum + Number(expense.total_amount || 0), 0);
    }
    
    return balance;
  };

  const handleAddMoney = () => {
    if (!moneyFormData.bank_id || !moneyFormData.amount) {
      alert('Please fill in all required fields');
      return;
    }
    createMoneyLog.mutate(moneyFormData, {
      onSuccess: () => {
        setShowAddMoneyForm(false);
        setMoneyFormData({
          action_type: 'add',
          bank_id: '',
          transaction_date: new Date().toISOString().split('T')[0],
          amount: '',
          remarks: ''
        });
      }
    });
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedMoneyLogs = [...(moneyLogs || [])].sort((a, b) => {
    if (!sortColumn) return 0;
    let aVal: any, bVal: any;
    const bankA = banks?.find((b: any) => b.id === a.bank_id);
    const bankB = banks?.find((b: any) => b.id === b.bank_id);
    switch (sortColumn) {
      case 'bank':
        aVal = bankA?.bank_name || '';
        bVal = bankB?.bank_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'type':
        aVal = a.action_type || '';
        bVal = b.action_type || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      case 'amount':
        aVal = Number(a.amount) || 0;
        bVal = Number(b.amount) || 0;
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'date':
        aVal = new Date(a.transaction_date).getTime();
        bVal = new Date(b.transaction_date).getTime();
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      case 'created':
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      default:
        return 0;
    }
  });

  const handleEditMoneyLog = () => {
    if (!editingMoneyLog || !moneyFormData.bank_id || !moneyFormData.amount) {
      alert('Please fill in all required fields');
      return;
    }
    updateMoneyLog.mutate({ id: editingMoneyLog.id, ...moneyFormData }, {
      onSuccess: () => {
        setEditingMoneyLog(null);
        setMoneyFormData({
          action_type: 'add',
          bank_id: '',
          transaction_date: new Date().toISOString().split('T')[0],
          amount: '',
          remarks: ''
        });
      }
    });
  };

  const totalBanks = banks?.length || 0;
  const activeBanks = banks?.filter((bank: any) => bank.is_active)?.length || 0;
  const inactiveBanks = banks?.filter((bank: any) => !bank.is_active)?.length || 0;
  const totalAccounts = banks?.length || 0;
  const totalBalance = banks?.reduce((sum: number, bank: any) => sum + calculateBankBalance(bank.id), 0) || 0;

  const filteredBanks = banks?.filter((bank: any) =>
    bank.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.account_holder_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const {
    currentPage,
    rowsPerPage,
    totalRows,
    paginatedData: paginatedBanks,
    handlePageChange,
    handleRowsPerPageChange,
    getSerialNumber,
  } = usePagination({ data: filteredBanks });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Bank Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage bank accounts and payment methods
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Dialog open={showAddMoneyForm} onOpenChange={setShowAddMoneyForm}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-success text-success hover:bg-success/10">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Add Money
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add/Deduct Money</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Action Type*</Label>
                    <Select value={moneyFormData.action_type} onValueChange={(value) => setMoneyFormData({...moneyFormData, action_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add</SelectItem>
                        <SelectItem value="deduct">Deduct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Select Bank*</Label>
                    <Select value={moneyFormData.bank_id} onValueChange={(value) => setMoneyFormData({...moneyFormData, bank_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks?.map((bank: any) => (
                          <SelectItem key={bank.id} value={bank.id}>{bank.bank_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date*</Label>
                    <Input type="date" value={moneyFormData.transaction_date} onChange={(e) => setMoneyFormData({...moneyFormData, transaction_date: e.target.value})} />
                  </div>
                  <div>
                    <Label>Amount*</Label>
                    <Input type="number" placeholder="Enter amount" value={moneyFormData.amount} onChange={(e) => setMoneyFormData({...moneyFormData, amount: e.target.value})} />
                  </div>
                  <div>
                    <Label>Remarks</Label>
                    <Textarea placeholder="Optional notes" value={moneyFormData.remarks} onChange={(e) => setMoneyFormData({...moneyFormData, remarks: e.target.value})} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowAddMoneyForm(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleAddMoney} disabled={createMoneyLog.isPending} className="flex-1 bg-gradient-primary">
                      {createMoneyLog.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <BankForm
              onSubmit={(data) => {
                createBank.mutate(data);
                setShowAddForm(false);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Landmark className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{totalBanks}</div>
                <div className="text-sm text-muted-foreground">Total Banks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
                <Landmark className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">{activeBanks}</div>
                <div className="text-sm text-muted-foreground">Active Banks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-secondary rounded-lg flex items-center justify-center">
                <Landmark className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">{inactiveBanks}</div>
                <div className="text-sm text-muted-foreground">Inactive</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-warning rounded-lg flex items-center justify-center">
                <Landmark className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">{totalAccounts}</div>
                <div className="text-sm text-muted-foreground">Accounts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-success">৳{formatCurrency(totalBalance)}</div>
                <div className="text-sm text-muted-foreground">Total Balance</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search banks by name or account holder..."
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

      {/* Banks Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Bank Name</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Account Holder</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedBanks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No banks found
                </TableCell>
              </TableRow>
            ) : (
              paginatedBanks.map((bank: any, index: number) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-medium text-muted-foreground">
                    {getSerialNumber(index)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <Landmark className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{bank.bank_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{bank.account_number}</TableCell>
                  <TableCell>{bank.account_holder_name}</TableCell>
                  <TableCell>{bank.branch_name}</TableCell>
                  <TableCell className="font-semibold text-success">৳{formatCurrency(calculateBankBalance(bank.id))}</TableCell>
                  <TableCell>
                    <Badge className={bank.is_active ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
                      {bank.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setViewingBank(bank)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingBank(bank)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingBank(bank)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
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

      {/* View Bank Dialog */}
      <Dialog open={!!viewingBank} onOpenChange={(open) => !open && setViewingBank(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
          </DialogHeader>
          {viewingBank && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                <p className="text-foreground">{viewingBank.bank_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                <p className="text-foreground font-mono">{viewingBank.account_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account Holder</label>
                <p className="text-foreground">{viewingBank.account_holder_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Branch</label>
                <p className="text-foreground">{viewingBank.branch_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <p className="text-foreground">
                  <Badge className={viewingBank.is_active ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'}>
                    {viewingBank.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Money Logs Table */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle>Add Money Logs</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('bank')}>
                <div className="flex items-center gap-1">
                  Bank Name
                  {sortColumn === 'bank' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">
                  Type
                  {sortColumn === 'type' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('amount')}>
                <div className="flex items-center gap-1">
                  Amount
                  {sortColumn === 'amount' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('date')}>
                <div className="flex items-center gap-1">
                  Date
                  {sortColumn === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="cursor-pointer hover:bg-secondary/50" onClick={() => handleSort('created')}>
                <div className="flex items-center gap-1">
                  Created At
                  {sortColumn === 'created' ? (sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />) : <ArrowUpDown className="h-4 w-4 opacity-50" />}
                </div>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!sortedMoneyLogs || sortedMoneyLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No money logs found
                </TableCell>
              </TableRow>
            ) : (
              sortedMoneyLogs.map((log: any) => {
                const bank = banks?.find((b: any) => b.id === log.bank_id);
                return (
                  <TableRow key={log.id}>
                    <TableCell>{bank?.bank_name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge className={log.action_type === 'add' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                        {log.action_type === 'add' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {log.action_type === 'add' ? 'Add' : 'Deduct'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">৳{formatCurrency(log.amount)}</TableCell>
                    <TableCell>{formatDate(log.transaction_date)}</TableCell>
                    <TableCell>{log.remarks || '-'}</TableCell>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setViewingMoneyLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canEdit && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingMoneyLog(log);
                                setMoneyFormData({
                                  action_type: log.action_type,
                                  bank_id: log.bank_id,
                                  transaction_date: log.transaction_date,
                                  amount: log.amount,
                                  remarks: log.remarks || ''
                                });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => setDeletingMoneyLog(log)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View Money Log Dialog */}
      <Dialog open={!!viewingMoneyLog} onOpenChange={(open) => !open && setViewingMoneyLog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Money Log Details</DialogTitle>
          </DialogHeader>
          {viewingMoneyLog && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                <p className="text-foreground">{banks?.find((b: any) => b.id === viewingMoneyLog.bank_id)?.bank_name || 'Unknown'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Action Type</label>
                <p className="text-foreground">
                  <Badge className={viewingMoneyLog.action_type === 'add' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                    {viewingMoneyLog.action_type === 'add' ? 'Add' : 'Deduct'}
                  </Badge>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Amount</label>
                <p className="text-foreground font-semibold">৳{formatCurrency(viewingMoneyLog.amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date</label>
                <p className="text-foreground">{formatDate(viewingMoneyLog.transaction_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Remarks</label>
                <p className="text-foreground">{viewingMoneyLog.remarks || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Money Log Dialog */}
      <Dialog open={!!editingMoneyLog} onOpenChange={(open) => {
        if (!open) {
          setEditingMoneyLog(null);
          setMoneyFormData({
            action_type: 'add',
            bank_id: '',
            transaction_date: new Date().toISOString().split('T')[0],
            amount: '',
            remarks: ''
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Money Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Action Type*</Label>
              <Select value={moneyFormData.action_type} onValueChange={(value) => setMoneyFormData({...moneyFormData, action_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add</SelectItem>
                  <SelectItem value="deduct">Deduct</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Select Bank*</Label>
              <Select value={moneyFormData.bank_id} onValueChange={(value) => setMoneyFormData({...moneyFormData, bank_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks?.map((bank: any) => (
                    <SelectItem key={bank.id} value={bank.id}>{bank.bank_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date*</Label>
              <Input type="date" value={moneyFormData.transaction_date} onChange={(e) => setMoneyFormData({...moneyFormData, transaction_date: e.target.value})} />
            </div>
            <div>
              <Label>Amount*</Label>
              <Input type="number" placeholder="Enter amount" value={moneyFormData.amount} onChange={(e) => setMoneyFormData({...moneyFormData, amount: e.target.value})} />
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea placeholder="Optional notes" value={moneyFormData.remarks} onChange={(e) => setMoneyFormData({...moneyFormData, remarks: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingMoneyLog(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleEditMoneyLog} disabled={updateMoneyLog.isPending} className="flex-1 bg-gradient-primary">
                {updateMoneyLog.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Bank Dialog */}
      <Dialog open={!!editingBank} onOpenChange={(open) => !open && setEditingBank(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bank</DialogTitle>
          </DialogHeader>
          {editingBank && (
            <BankForm
              initialData={editingBank}
              onSubmit={(data) => {
                updateBank.mutate({ id: editingBank.id, ...data });
                setEditingBank(null);
              }}
              onCancel={() => setEditingBank(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Bank Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingBank}
        onOpenChange={(open) => !open && setDeletingBank(null)}
        onConfirm={() => deleteBank.mutate(deletingBank.id)}
        title="Delete Bank"
        description="Are you sure you want to delete this bank?"
        details={[
          { label: "Bank Name", value: deletingBank?.bank_name || '' },
          { label: "Account Number", value: deletingBank?.account_number || '' },
          { label: "Account Holder", value: deletingBank?.account_holder_name || '' },
          { label: "Branch", value: deletingBank?.branch_name || '' },
          { label: "Current Balance", value: deletingBank ? `৳${formatCurrency(calculateBankBalance(deletingBank.id))}` : '' }
        ]}
      />
      
      {/* Delete Money Log Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletingMoneyLog}
        onOpenChange={(open) => !open && setDeletingMoneyLog(null)}
        onConfirm={() => deleteMoneyLog.mutate(deletingMoneyLog.id)}
        title="Delete Money Log"
        description="Are you sure you want to delete this money log?"
        details={[
          { label: "Bank", value: deletingMoneyLog ? (banks?.find((b: any) => b.id === deletingMoneyLog.bank_id)?.bank_name || 'Unknown') : '' },
          { label: "Type", value: deletingMoneyLog?.action_type === 'add' ? 'Add' : 'Deduct' },
          { label: "Amount", value: deletingMoneyLog ? `৳${formatCurrency(deletingMoneyLog.amount)}` : '' },
          { label: "Date", value: deletingMoneyLog ? formatDate(deletingMoneyLog.transaction_date) : '' },
          { label: "Remarks", value: deletingMoneyLog?.remarks || '-' }
        ]}
      />
    </div>
  );
}