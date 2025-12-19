import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { FranchiseForm } from "@/components/forms/FranchiseForm";
import { MachineForm } from "@/components/forms/MachineForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBankMoneyLogs } from "@/hooks/useBankMoneyLogs";
import { useBanks } from "@/hooks/useBanks";
import { useCreateFranchise, useFranchises } from "@/hooks/useFranchises";
import { useMachineCounters } from "@/hooks/useMachineCounters";
import { useCreateMachineExpense, useMachineExpenses } from "@/hooks/useMachineExpenses";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { useCreateMachine, useMachines } from "@/hooks/useMachines";
import { usePermissions } from "@/hooks/usePermissions";
import { useSales } from "@/hooks/useSales";
import { useMachineWisePrizeStock } from "@/hooks/useInventory";
import { formatCurrency, formatNumber } from "@/lib/numberUtils";
import { format } from 'date-fns';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  ChevronLeft, ChevronRight,
  Cpu,
  CreditCard,
  DollarSign,
  Eye,
  Landmark,
  Package,
  Receipt,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BankTransactionsDialog } from "@/components/BankTransactionsDialog";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';



export default function Dashboard() {
  const navigate = useNavigate();
  const { canEdit } = usePermissions();
  const [filterType, setFilterType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return lastMonth.toISOString().slice(0, 7);
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [showFranchiseForm, setShowFranchiseForm] = useState(false);
  const [showMachineForm, setShowMachineForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showDueListModal, setShowDueListModal] = useState(false);
  const [showHighestSalesModal, setShowHighestSalesModal] = useState(false);
  const [showLowestSalesModal, setShowLowestSalesModal] = useState(false);
  const [showPrizePurchaseModal, setShowPrizePurchaseModal] = useState(false);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLimit, setTransactionLimit] = useState(10);
  const [viewingBankTransactions, setViewingBankTransactions] = useState<any | null>(null);

  const quickActions = [
    {
      title: "Add New Franchise",
      description: "Register a new franchise partner",
      icon: Building2,
      action: () => setShowFranchiseForm(true)
    },
    {
      title: "Add Machine",
      description: "Register a new gaming machine",
      icon: Cpu,
      action: () => setShowMachineForm(true)
    },
    {
      title: "Record Expense",
      description: "Add operational expense",
      icon: DollarSign,
      action: () => setShowExpenseForm(true)
    },
    {
      title: "Manage Users",
      description: "Add or manage system users",
      icon: Users,
      action: () => navigate('/users')
    }
  ];

  const { data: sales } = useSales();
  const { data: machines } = useMachines();
  const { data: expenses } = useMachineExpenses();
  const { data: payments } = useMachinePayments();
  const { data: franchises } = useFranchises();
  const { data: counterReadings } = useMachineCounters();
  const { data: banks } = useBanks();
  const { data: moneyLogs } = useBankMoneyLogs();
  const { data: machineWiseStock = [] } = useMachineWisePrizeStock();
  const createFranchise = useCreateFranchise();
  const createMachine = useCreateMachine();
  const createExpense = useCreateMachineExpense();


  // Filter data based on selected period
  const filteredSales = sales?.filter(sale => {
    if (!sale.sales_date) return false;
    const saleDate = new Date(sale.sales_date);
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      return saleDate.getFullYear() === parseInt(year) && saleDate.getMonth() === parseInt(month) - 1;
    } else {
      return saleDate.getFullYear() === parseInt(selectedYear);
    }
  }) || [];

  const filteredExpenses = expenses?.filter(expense => {
    if (!expense.expense_date) return false;
    const date = new Date(expense.expense_date);
    const expenseDateLocal = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      return expenseDateLocal >= startDate && expenseDateLocal <= endDate;
    } else {
      return expenseDateLocal.startsWith(selectedYear);
    }
  }) || [];

  const filteredPayments = payments?.filter(payment => {
    // Use invoice date (sales_date) instead of payment_date for filtering
    const invoiceDate = payment.sales?.sales_date;
    if (!invoiceDate) return false;
    const dateToFilter = new Date(invoiceDate);
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      return dateToFilter.getFullYear() === parseInt(year) && dateToFilter.getMonth() === parseInt(month) - 1;
    } else {
      return dateToFilter.getFullYear() === parseInt(selectedYear);
    }
  }) || [];

  // Calculations
  const activeMachines = machines?.filter(machine => !machine.notes?.includes('[STATUS:inactive]')) || [];
  const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0);

  // Machine-wise sales for highest/lowest from filtered sales data
  const machineSalesMap = new Map();

  filteredSales.forEach(sale => {
    if (sale.machine_id && sale.sales_amount) {
      const machineId = sale.machine_id;
      const machineName = sale.machines?.machine_name || machines?.find(m => m.id === machineId)?.machine_name || 'Unknown Machine';
      const currentTotal = machineSalesMap.get(machineId) || { total: 0, machineName };
      machineSalesMap.set(machineId, {
        total: currentTotal.total + Number(sale.sales_amount),
        machineName
      });
    }
  });

  const machineSales = Array.from(machineSalesMap.values()).filter(machine => machine.total > 0);

  const highestMachine = machineSales.length > 0 ? machineSales.reduce((max, current) => current.total > max.total ? current : max) : null;
  const lowestMachine = machineSales.length > 0 ? machineSales.reduce((min, current) => current.total < min.total ? current : min) : null;

  const highestMachineSales = highestMachine?.total || 0;
  const lowestMachineSales = lowestMachine?.total || 0;
  const avgSalesPerMachine = activeMachines.length > 0 ? totalSales / activeMachines.length : 0;

  // Calculate payment status for each sale (same as Sales.tsx)
  const getPaymentStatus = (sale: any) => {
    const salePayments = payments?.filter(p => {
      if (p.invoice_id !== sale.id) return false;
      const remarks = (p.remarks || '').toLowerCase();
      return !remarks.includes('coin adjustment:') && 
             !remarks.includes('prize adjustment:') && 
             !remarks.includes('amount adjustment:');
    }) || [];
    const totalPaid = Math.round(salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) * 100) / 100;
    const payToClowee = Math.round(Number(sale.pay_to_clowee || 0) * 100) / 100;
    
    if (totalPaid === 0) return { status: 'Due', totalPaid, balance: payToClowee };
    if (totalPaid >= payToClowee) return { status: totalPaid > payToClowee ? 'Overpaid' : 'Paid', totalPaid, balance: 0 };
    return { status: 'Partial', totalPaid, balance: payToClowee - totalPaid };
  };

  const totalPrizePurchase = filteredExpenses.filter(expense => expense.expense_categories?.category_name === 'Prize Purchase').reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0);
  const totalPrizeQuantity = filteredExpenses.filter(expense => expense.expense_categories?.category_name === 'Prize Purchase').reduce((sum, expense) => sum + (expense.quantity || 0), 0);

  // Calculate totals for cards
  const totalPayToClowee = filteredSales.reduce((sum, sale) => sum + Number(sale.pay_to_clowee || 0), 0);
  const totalPaymentReceived = filteredSales.reduce((sum, sale) => {
    const status = getPaymentStatus(sale);
    return sum + status.totalPaid;
  }, 0);
  
  // Calculate total due from sales with Due or Partial status
  const totalDue = filteredSales.reduce((sum, sale) => {
    const status = getPaymentStatus(sale);
    return sum + (status.status === 'Due' || status.status === 'Partial' ? status.balance : 0);
  }, 0);


  // Bank calculations (cumulative totals, not filtered by period)
  const calculateBankBalance = (bankName: string) => {
    const bank = banks?.find(b => b.bank_name === bankName);
    if (!bank) return 0;

    let balance = 0;

    // Add money logs (add/deduct)
    if (moneyLogs && moneyLogs.length > 0) {
      balance += moneyLogs
        .filter((log: any) => log.bank_id === bank.id)
        .reduce((sum: number, log: any) => {
          const amount = Number(log.amount) || 0;
          return log.action_type === 'add' ? sum + amount : sum - amount;
        }, 0);
    }

    // Add payments received
    balance += payments?.filter(payment => payment.bank_id === bank.id).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

    // Subtract expenses
    balance -= expenses?.filter(expense => expense.bank_id === bank.id).reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0) || 0;

    return balance;
  };

  const cashInHand = calculateBankBalance('Cash');
  const mdbBank = calculateBankBalance('MDB Bank');
  const nccBank = calculateBankBalance('NCC Bank');
  const bkashPersonal = calculateBankBalance('Bkash(Personal)');
  
  // Calculate total cash amount (Cash In Hand + MDB Bank + Bkash Personal)
  const totalCashAmount = cashInHand + mdbBank + bkashPersonal;

  // Prepare chart data
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = filterType === 'year' ? parseInt(selectedYear) : new Date(selectedMonth).getFullYear();

    return months.map((month, index) => {
      const monthSales = sales?.filter(sale => {
        if (!sale.sales_date) return false;
        const saleDate = new Date(sale.sales_date);
        return saleDate.getFullYear() === currentYear && saleDate.getMonth() === index;
      }) || [];

      const salesAmount = monthSales.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0);

      return {
        month,
        sales: Math.round(salesAmount * 100) / 100
      };
    });
  };

  const chartData = getChartData();

  // Format selected period for display
  const getFormattedPeriod = () => {
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      return selectedYear;
    }
  };

  // Get all transactions with pagination
  const getAllTransactions = () => {
    const transactions = [];

    // Add sales transactions
    sales?.forEach(sale => {
      const machine = machines?.find(m => m.id === sale.machine_id);
      const userName = sale.created_by_user?.name || 'System';
      transactions.push({
        id: `sale-${sale.id}`,
        type: 'Sales Entry',
        machineName: machine?.machine_name || 'Unknown Machine',
        amount: `+৳${formatCurrency(sale.sales_amount || 0)}`,
        date: new Date(sale.created_at || sale.sales_date),
        userName: userName,
        icon: DollarSign,
        color: 'text-success'
      });
    });

    // Add expense transactions
    expenses?.forEach(expense => {
      const machine = machines?.find(m => m.id === expense.machine_id);
      const userName = expense.created_by_user?.name || 'System';
      transactions.push({
        id: `expense-${expense.id}`,
        type: 'Expense Entry',
        machineName: machine?.machine_name || 'General Expense',
        amount: `-৳${formatCurrency(expense.total_amount || 0)}`,
        date: new Date(expense.created_at || expense.expense_date),
        userName: userName,
        icon: Package,
        color: 'text-destructive'
      });
    });

    // Add payment transactions
    payments?.forEach(payment => {
      const machine = machines?.find(m => m.id === payment.machine_id);
      const userName = payment.created_by_user?.name || 'System';
      transactions.push({
        id: `payment-${payment.id}`,
        type: 'Payment Received',
        machineName: machine?.machine_name || 'General Payment',
        amount: `+৳${formatCurrency(payment.amount || 0)}`,
        date: new Date(payment.created_at || payment.payment_date),
        userName: userName,
        icon: CreditCard,
        color: 'text-primary'
      });
    });

    // Add counter reading transactions
    counterReadings?.forEach(reading => {
      const machine = machines?.find(m => m.id === reading.machine_id);
      const userName = reading.created_by_user?.name || 'System';
      transactions.push({
        id: `reading-${reading.id}`,
        type: 'Counter Reading',
        machineName: machine?.machine_name || 'Unknown Machine',
        amount: `${reading.coin_counter} coins`,
        date: new Date(reading.created_at || reading.reading_date),
        userName: userName,
        icon: Activity,
        color: 'text-accent'
      });
    });

    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  };

  const allTransactions = getAllTransactions();
  const totalPages = transactionLimit === -1 ? 1 : Math.ceil(allTransactions.length / transactionLimit);
  const startIndex = (transactionPage - 1) * transactionLimit;
  const paginatedTransactions = transactionLimit === -1 ? allTransactions : allTransactions.slice(startIndex, startIndex + transactionLimit);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Monitor your franchise performance and key metrics
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={filterType} onValueChange={(value: 'month' | 'year') => setFilterType(value)}>
              <SelectTrigger className="w-40 sm:w-24 bg-secondary/30 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
            {filterType === 'month' ? (
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-1 sm:w-40 bg-secondary/30 border-border"
              />
            ) : (
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2020"
                max="2030"
                className="flex-1 sm:w-24 bg-secondary/30 border-border"
              />
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-primary/10 rounded-lg border border-primary/20 w-full sm:w-auto justify-center">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium text-primary">{activeMachines.length} Active Machines</span>
          </div>
        </div>
      </div>

      {/* Stats Grid card */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Total Sales
            </CardTitle>
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-success mb-0">
              ৳{formatCurrency(totalSales)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {filteredSales.length} invoices
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Top Sales
            </CardTitle>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer" onClick={() => setShowHighestSalesModal(true)} />
              <TrendingUp className="h-3 w-3 sm:h-5 sm:w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-primary mb-0">
              ৳{formatCurrency(highestMachineSales)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
              {highestMachine?.machineName || 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Lowest Sales
            </CardTitle>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer" onClick={() => setShowLowestSalesModal(true)} />
              <ArrowDownRight className="h-3 w-3 sm:h-5 sm:w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-warning mb-0">
              ৳{formatCurrency(lowestMachineSales)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
              {lowestMachine?.machineName || 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Average Sales
            </CardTitle>
            <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-white mb-0">
              ৳{formatCurrency(avgSalesPerMachine)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              Sales Average Per active machine
            </div>
          </CardContent>
        </Card>


        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Clowee Revenue
            </CardTitle>
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-warning mb-0">
              ৳{formatCurrency(totalPayToClowee)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              Clowee Profit + Doll + Main. Cost etc.
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Payment Received
            </CardTitle>
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-success mb-0">
              ৳{formatCurrency(totalPaymentReceived)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              Payments received
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Total Due
            </CardTitle>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer" onClick={() => setShowDueListModal(true)} />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-destructive mb-0">
              ৳{formatCurrency(totalDue)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              Receivable Amount
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Doll Purchased
            </CardTitle>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer" onClick={() => setShowPrizePurchaseModal(true)} />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-primary mb-0">
              ৳{formatCurrency(totalPrizePurchase)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              Total Doll Qty: {totalPrizeQuantity}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Cash Balance
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer hover:text-primary/80" onClick={() => {
                const cashBank = banks?.find(b => b.bank_name === 'Cash');
                if (cashBank) setViewingBankTransactions(cashBank);
              }} />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-success mb-0">
              ৳ {formatCurrency(cashInHand)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              Total Cash In Hand: ৳{formatCurrency(totalCashAmount)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              MDB Bank
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer hover:text-primary/80" onClick={() => {
                const mdbBankData = banks?.find(b => b.bank_name === 'MDB Bank');
                if (mdbBankData) setViewingBankTransactions(mdbBankData);
              }} />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-primary mb-0">
              ৳{formatCurrency(mdbBank)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              MDB Bank Balance
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              Bkash(Personal)
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer hover:text-primary/80" onClick={() => {
                const bkashBank = banks?.find(b => b.bank_name === 'Bkash(Personal)');
                if (bkashBank) setViewingBankTransactions(bkashBank);
              }} />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-warning mb-0">
              ৳{formatCurrency(bkashPersonal)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              Bkash Balance
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground leading-tight">
              NCC Bank
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 sm:h-5 sm:w-5 text-primary cursor-pointer hover:text-primary/80" onClick={() => {
                const nccBankData = banks?.find(b => b.bank_name === 'NCC Bank');
                if (nccBankData) setViewingBankTransactions(nccBankData);
              }} />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-extrabold sm:text-2xl sm:font-bold text-accent mb-0">
              ৳{formatCurrency(nccBank)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              NCC Bank Balance
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/10 transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Month-Wise Sale
            </CardTitle>
            <CardDescription>Total sales revenue throughout {filterType === 'year' ? selectedYear : new Date(selectedMonth).getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `৳${formatNumber(value)}`}
                />
                <Tooltip
                  formatter={(value, name) => [`৳${formatCurrency(Number(value))}`, 'Sales Amount']}
                  labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                  }}
                  cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                />
                <Bar
                  dataKey="sales"
                  fill="url(#salesGradient)"
                  radius={[6, 6, 0, 0]}
                  stroke="#10B981"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>


        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/10 transition-all duration-200">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-warning" />
              Clowee Revenue Trends
            </CardTitle>
            <CardDescription>Monthly revenue trend throughout {filterType === 'year' ? selectedYear : new Date(selectedMonth).getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={(() => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const currentYear = filterType === 'year' ? parseInt(selectedYear) : new Date(selectedMonth).getFullYear();
                return months.map((month, index) => {
                  const monthSales = sales?.filter(sale => {
                    if (!sale.sales_date) return false;
                    const saleDate = new Date(sale.sales_date);
                    return saleDate.getFullYear() === currentYear && saleDate.getMonth() === index;
                  }) || [];
                  const revenue = monthSales.reduce((sum, sale) => sum + Number(sale.pay_to_clowee || 0), 0);
                  return { month, revenue: Math.round(revenue * 100) / 100 };
                });
              })()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="month"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `৳${formatNumber(value)}`}
                />
                <Tooltip
                  formatter={(value, name) => [`৳${formatCurrency(Number(value))}`, 'Revenue']}
                  labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                  }}
                  cursor={{ stroke: '#F59E0B', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {canEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {quickActions.map((action, index) => (
            <Card key={index} className="bg-gradient-glass border-border shadow-card hover:shadow-neon/10 transition-all duration-200 cursor-pointer group" onClick={action.action}>
              <CardHeader className="text-center pb-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-3 group-hover:shadow-neon transition-all duration-200">
                  <action.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg text-foreground">
                  {action.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {action.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <Dialog open={showFranchiseForm} onOpenChange={setShowFranchiseForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Add New Franchise</DialogTitle>
          <FranchiseForm
            onSubmit={(data) => {
              createFranchise.mutate(data);
              setShowFranchiseForm(false);
            }}
            onCancel={() => setShowFranchiseForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showMachineForm} onOpenChange={setShowMachineForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Add New Machine</DialogTitle>
          <MachineForm
            onSubmit={(data) => {
              createMachine.mutate(data);
              setShowMachineForm(false);
            }}
            onCancel={() => setShowMachineForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Record New Expense</DialogTitle>
          <ExpenseForm
            onSubmit={(data) => {
              createExpense.mutate(data);
              setShowExpenseForm(false);
            }}
            onCancel={() => setShowExpenseForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Highest Machine Sales Modal */}
      <Dialog open={showHighestSalesModal} onOpenChange={setShowHighestSalesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Highest Machine Sales - All Sales ({getFormattedPeriod()})</DialogTitle>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-3 pr-4">
              {machineSales.sort((a, b) => b.total - a.total).map((machine, index) => {
                const machineSalesData = filteredSales
                  .filter(sale => sale.machines?.machine_name === machine.machineName)
                  .sort((a, b) => new Date(b.sales_date).getTime() - new Date(a.sales_date).getTime());

                return (
                  <div key={index} className="border border-border rounded-lg p-4 bg-gradient-glass">
                    <div className="space-y-2">
                      {machineSalesData.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <div className="font-bold text-foreground">{machine.machineName}</div>
                            <span className="text-sm">{format(new Date(sale.sales_date), 'd MMM yyyy')}</span>
                          </div>
                          <span className="text-sm font-medium text-success">৳{formatCurrency(sale.sales_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Lowest Machine Sales Modal */}
      <Dialog open={showLowestSalesModal} onOpenChange={setShowLowestSalesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Lowest Machine Sales - All Sales ({getFormattedPeriod()})</DialogTitle>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-3 pr-4">
              {machineSales.sort((a, b) => a.total - b.total).map((machine, index) => {
                const machineSalesData = filteredSales
                  .filter(sale => sale.machines?.machine_name === machine.machineName)
                  .sort((a, b) => new Date(b.sales_date).getTime() - new Date(a.sales_date).getTime());
                return (
                  <div key={index} className="border border-border rounded-lg p-4 bg-gradient-glass">
                    <div className="space-y-2">
                      {machineSalesData.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <div className="font-bold text-foreground">{machine.machineName}</div>
                            <span className="text-sm">{format(new Date(sale.sales_date), 'd MMM yyyy')}</span>
                          </div>
                          <span className="text-sm font-medium text-success">৳{formatCurrency(sale.sales_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Prize Purchase History Modal */}
      <Dialog open={showPrizePurchaseModal} onOpenChange={setShowPrizePurchaseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Doll Purchase History ({getFormattedPeriod()})</DialogTitle>
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-3 pr-4">
              {filteredExpenses
                .filter(expense => expense.expense_categories?.category_name === 'Prize Purchase')
                .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
                .map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{expense.expense_details || 'Prize Purchase'}</span>
                          <span className="text-xs text-muted-foreground">Qty: {expense.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{expense.machines?.machine_name || 'No Machine'}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(expense.expense_date), 'd MMM yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-primary">৳{formatCurrency(expense.total_amount)}</span>
                  </div>
                ))}
              {filteredExpenses.filter(expense => expense.expense_categories?.category_name === 'Prize Purchase').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No doll purchases found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Due List Modal */}
      <Dialog open={showDueListModal} onOpenChange={setShowDueListModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Due List ({getFormattedPeriod()})</DialogTitle>
          <div className="space-y-3">
            {(() => {
              const salesWithDue = filteredSales
                .map(sale => {
                  const status = getPaymentStatus(sale);
                  return {
                    id: sale.id,
                    invoiceNumber: sale.invoice_number || 'Pending',
                    machineName: sale.machines?.machine_name || 'Unknown Machine',
                    salesDate: sale.sales_date,
                    payToClowee: Number(sale.pay_to_clowee || 0),
                    totalPaid: status.totalPaid,
                    balance: status.balance,
                    status: status.status
                  };
                })
                .filter(sale => sale.status === 'Due' || sale.status === 'Partial')
                .sort((a, b) => b.balance - a.balance);

              const totalDueAmount = salesWithDue.reduce((sum, sale) => sum + sale.balance, 0);

              return salesWithDue.length > 0 ? (
                <>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Due Amount:</span>
                      <span className="text-xl font-bold text-destructive">৳{formatCurrency(totalDueAmount)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{salesWithDue.length} invoice(s) with outstanding balance</div>
                  </div>
                  <div className="space-y-2">
                    {salesWithDue.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-8 h-8 ${sale.status === 'Partial' ? 'bg-warning/20' : 'bg-destructive/20'} rounded-full flex items-center justify-center`}>
                            <Receipt className={`h-4 w-4 ${sale.status === 'Partial' ? 'text-warning' : 'text-destructive'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{sale.machineName}</span>
                              <span className="text-xs text-muted-foreground">#{sale.invoiceNumber}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{format(new Date(sale.salesDate), 'd MMM yyyy')}</p>
                            {sale.status === 'Partial' && (
                              <p className="text-xs text-warning mt-1">Paid: ৳{formatCurrency(sale.totalPaid)} / ৳{formatCurrency(sale.payToClowee)}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-destructive">৳{formatCurrency(sale.balance)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No outstanding dues</p>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Transactions</CardTitle>
            <CardDescription>Latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pagination Controls */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Show:</span>
                  <Select value={transactionLimit.toString()} onValueChange={(value) => {
                    setTransactionLimit(value === 'all' ? -1 : parseInt(value));
                    setTransactionPage(1);
                  }}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {transactionLimit !== -1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransactionPage(Math.max(1, transactionPage - 1))}
                      disabled={transactionPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-muted-foreground">
                      {transactionPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransactionPage(Math.min(totalPages, transactionPage + 1))}
                      disabled={transactionPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Scrollable Transaction List */}
              <ScrollArea className="h-80">
                <div className="space-y-3 pr-4">
                  {paginatedTransactions.length > 0 ? paginatedTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                          <transaction.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{transaction.type} - {transaction.machineName}</p>
                          <p className="text-sm text-muted-foreground">({transaction.userName}, {format(transaction.date, 'h:mm a d MMM yyyy')})</p>
                        </div>
                      </div>
                      <span className={`font-medium ${transaction.color}`}>{transaction.amount}</span>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent transactions</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-destructive/50 shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              System Alerts
            </CardTitle>
            <CardDescription>Low inventory warnings</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const lowStockMachines = machineWiseStock.filter((m: any) => m.stock < 50);
              return lowStockMachines.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Machine</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockMachines.map((machine: any) => (
                        <TableRow key={machine.machineId} className="bg-destructive/10">
                          <TableCell className="font-medium">{machine.machineName}</TableCell>
                          <TableCell className="font-bold text-destructive">{machine.stock}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-xs">Low</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No low stock alerts</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Bank Transactions Dialog */}
      <BankTransactionsDialog
        bank={viewingBankTransactions}
        open={!!viewingBankTransactions}
        onOpenChange={(open) => !open && setViewingBankTransactions(null)}
        moneyLogs={moneyLogs || []}
        payments={payments || []}
        expenses={expenses || []}
        calculateBankBalance={calculateBankBalance}
      />
    </div>
  );
}