 import { ExpenseForm } from "@/components/forms/ExpenseForm";
import { FranchiseForm } from "@/components/forms/FranchiseForm";
import { MachineForm } from "@/components/forms/MachineForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateFranchise, useFranchises } from "@/hooks/useFranchises";
import { useMachineCounters } from "@/hooks/useMachineCounters";
import { useCreateMachineExpense, useMachineExpenses } from "@/hooks/useMachineExpenses";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { useCreateMachine, useMachines } from "@/hooks/useMachines";
import { usePermissions } from "@/hooks/usePermissions";
import { useSales } from "@/hooks/useSales";
import { formatCurrency, formatNumber } from "@/lib/numberUtils";
import { format } from 'date-fns';
import {
  Activity,
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
  Sprout,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";
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
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLimit, setTransactionLimit] = useState(10);

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
    const expenseDate = new Date(expense.expense_date);
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      return expenseDate.getFullYear() === parseInt(year) && expenseDate.getMonth() === parseInt(month) - 1;
    } else {
      return expenseDate.getFullYear() === parseInt(selectedYear);
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
  
  const totalPaymentReceived = filteredPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  //const totalDue = filteredSales.reduce((sum, sale) => sum + Number(sale.pay_to_clowee || 0), 0);

  const totalPrizePurchase = filteredExpenses.filter(expense => expense.expense_categories?.category_name === 'Prize Purchase').reduce((sum, expense) => sum + (expense.total_amount || 0), 0);
  const totalPrizeQuantity = filteredExpenses.filter(expense => expense.expense_categories?.category_name === 'Prize Purchase').reduce((sum, expense) => sum + (expense.quantity || 0), 0);
  
  // Total expenses excluding Profit Share (Share Holders)
  const totalExpenses = filteredExpenses
    .filter(expense => expense.expense_categories?.category_name !== 'Profit ShareProfit Share(Share Holders)')
    .reduce((sum: number, expense) => sum + (expense.total_amount || 0), 0);
  
  // Net Profit = Pay To Clowee (sum from Sales table) - total expense (except Profit Share)
  const totalPayToClowee = filteredSales.reduce((sum, sale) => sum + Number(sale.pay_to_clowee || 0), 0);
  const netProfit = totalPayToClowee - totalExpenses;
  const totalDue = totalPayToClowee - totalPaymentReceived;


  // Bank calculations (cumulative totals, not filtered by period)
  const cashPayments = payments?.filter(payment => payment.banks?.bank_name === 'Cash').reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
  const cashExpenses = expenses?.filter(expense => expense.banks?.bank_name === 'Cash').reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0) || 0;
  const cashInHand = cashPayments - cashExpenses;

  const mdbPayments = payments?.filter(payment => payment.banks?.bank_name === 'MDB Bank').reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
  const mdbExpenses = expenses?.filter(expense => expense.banks?.bank_name === 'MDB Bank').reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0) || 0;
  const mdbBank = mdbPayments - mdbExpenses;

  const nccPayments = payments?.filter(payment => payment.banks?.bank_name === 'NCC Bank').reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
  const nccExpenses = expenses?.filter(expense => expense.banks?.bank_name === 'NCC Bank').reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0) || 0;
  const nccBank = nccPayments - nccExpenses;

  // Prepare chart data with proper profit calculation
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = filterType === 'year' ? parseInt(selectedYear) : new Date(selectedMonth).getFullYear();
    
    return months.map((month, index) => {
      // Filter sales for this month
      const monthSales = sales?.filter(sale => {
        if (!sale.sales_date) return false;
        const saleDate = new Date(sale.sales_date);
        return saleDate.getFullYear() === currentYear && saleDate.getMonth() === index;
      }) || [];
      
      // Filter expenses for this month (excluding Profit Share)
      const monthExpenses = expenses?.filter(expense => {
        if (!expense.expense_date) return false;
        const expenseDate = new Date(expense.expense_date);
        const isNotProfitShare = expense.expense_categories?.category_name !== 'Profit Share(Share Holders)';
        return expenseDate.getFullYear() === currentYear && expenseDate.getMonth() === index && isNotProfitShare;
      }) || [];
      
      // Calculate totals
      const salesAmount = monthSales.reduce((sum, sale) => sum + Number(sale.sales_amount || 0), 0);
      const payToCloweeAmount = monthSales.reduce((sum, sale) => sum + Number(sale.pay_to_clowee || 0), 0);
      const expensesAmount = monthExpenses.reduce((sum, expense) => sum + Number(expense.total_amount || 0), 0);
      
      // Net Profit = Pay To Clowee - Expenses (excluding Profit Share)
      const netProfit = payToCloweeAmount - expensesAmount;
      
      return {
        month,
        sales: Math.round(salesAmount * 100) / 100,
        profit: Math.round(netProfit * 100) / 100,
        payToClowee: Math.round(payToCloweeAmount * 100) / 100,
        expenses: Math.round(expensesAmount * 100) / 100
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
            <Calendar className="h-4 w-4 text-white" />
            <Select value={filterType} onValueChange={(value: 'month' | 'year') => setFilterType(value)}>
              <SelectTrigger className="w-20 sm:w-24 bg-secondary/30 border-border">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4 md:gap-6">
        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success mb-0">
              ৳{formatCurrency(totalSales)}
            </div>
            <div className="text-xs text-muted-foreground">
              {filteredSales.length} invoices
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Machine Sales
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 text-primary cursor-pointer" onClick={() => setShowHighestSalesModal(true)} />
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-primary mb-0">
              ৳{formatCurrency(highestMachineSales)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {highestMachine?.machineName || 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lowest Machine Sales
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 text-primary cursor-pointer" onClick={() => setShowLowestSalesModal(true)} />
              <ArrowDownRight className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-warning mb-0">
              ৳{formatCurrency(lowestMachineSales)}
            </div>
            <div className="text-xs text-muted-foreground">
              {lowestMachine?.machineName || 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Sales/Machine
            </CardTitle>
            <Cpu className="h-5 w-5 text-white" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-white mb-0">
              ৳{formatCurrency(avgSalesPerMachine)}
            </div>
            <div className="text-xs text-muted-foreground">
              Sales Average Per active machine
            </div>
          </CardContent>
        </Card>


        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Profit
            </CardTitle>
            <Sprout className="h-5 w-5 text-accent"/>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-accent mb-0">
              ৳{formatCurrency(netProfit)}
            </div>
            <div className="text-xs text-muted-foreground">
              Clowee Net Profit After All Cost
            </div>
          </CardContent>
        </Card>

          <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pay To Clowee
            </CardTitle>
            <Receipt className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-warning mb-0">
              ৳{formatCurrency(totalPayToClowee)}
            </div>
            <div className="text-xs text-muted-foreground">
              Clowee Profit + Doll Sale + Maintenace Cost
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payment Received
            </CardTitle>
            <CreditCard className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-success mb-0">
              ৳{formatCurrency(totalPaymentReceived)}
            </div>
            <div className="text-xs text-muted-foreground">
              Payments received
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Due
            </CardTitle>
            <div className="flex items-center gap-1">
              <Eye className="h-5 w-5 text-primary cursor-pointer" onClick={() => setShowDueListModal(true)} />
              <ArrowUpRight className="h-5 w-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-destructive mb-0">
              ৳{formatCurrency(totalDue)}
            </div>
            <div className="text-xs text-muted-foreground">
              Receivable Amount
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Prize Purchase Amount
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-primary mb-0">
              ৳{formatCurrency(totalPrizePurchase)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total Doll Qty: {totalPrizeQuantity}
            </div>
          </CardContent>
        </Card>



        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cash In Hand
            </CardTitle>
            <Wallet className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-success mb-0">
              ৳{formatCurrency(cashInHand)}
            </div>
            <div className="text-xs text-muted-foreground">
              Cash Amount
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MDB Bank
            </CardTitle>
            <Landmark className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-primary mb-0">
              ৳{formatCurrency(mdbBank)}
            </div>
            <div className="text-xs text-muted-foreground">
              MDB Bank Balance
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              NCC Bank
            </CardTitle>
            <Landmark className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-accent mb-0">
              ৳{formatCurrency(nccBank)}
            </div>
            <div className="text-xs text-muted-foreground">
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
              Month-Wise Sales
            </CardTitle>
            <CardDescription>Total sales revenue throughout {filterType === 'year' ? selectedYear : new Date(selectedMonth).getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.3}/>
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
              <TrendingUp className="h-5 w-5 text-primary" />
              Month-Wise Net Profit
            </CardTitle>
            <CardDescription>Net profit after all expenses throughout {filterType === 'year' ? selectedYear : new Date(selectedMonth).getFullYear()}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
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
                  formatter={(value, name) => {
                    const numValue = Number(value);
                    const color = numValue >= 0 ? '#10B981' : '#EF4444';
                    return [
                      <span style={{ color }}>
                        ৳{formatCurrency(Math.abs(numValue))} {numValue < 0 ? '(Loss)' : ''}
                      </span>, 
                      'Net Profit'
                    ];
                  }}
                  labelStyle={{ color: '#F9FAFB', fontWeight: 'bold' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                  }}
                  cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fill="url(#profitGradient)"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5, stroke: '#1F2937' }}
                  activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2, fill: '#1F2937' }}
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

      {/* Due List Modal */}
      <Dialog open={showDueListModal} onOpenChange={setShowDueListModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Due List - All Sales</DialogTitle>
          <div className="space-y-3">
            {(() => {
              const salesWithDue = filteredSales
                .map(sale => {
                  const payToClowee = Number(sale.pay_to_clowee || 0);
                  const salePayments = filteredPayments.filter(p => p.invoice_id === sale.id);
                  const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                  const due = payToClowee - totalPaid;
                  
                  return {
                    id: sale.id,
                    machineName: sale.machines?.machine_name || 'Unknown Machine',
                    salesDate: sale.sales_date,
                    payToClowee,
                    totalPaid,
                    due
                  };
                })
                .filter(sale => sale.due > 0)
                .sort((a, b) => new Date(b.salesDate).getTime() - new Date(a.salesDate).getTime());
              
              return salesWithDue.length > 0 ? (
                <div className="space-y-2">
                  {salesWithDue.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-warning/20 rounded-full flex items-center justify-center">
                          <Cpu className="h-4 w-4 text-warning" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-foreground">{sale.machineName}</span>
                          <p className="text-xs text-muted-foreground">{format(new Date(sale.salesDate), 'd MMM yyyy')}</p>
                        </div>
                      </div>
                      <span className="font-bold text-destructive">৳{formatCurrency(sale.due)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No dues found</p>
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

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">System Alerts</CardTitle>
            <CardDescription>Important notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Low inventory alert</p>
                    <p className="text-sm text-muted-foreground">Prize dolls running low</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}