 import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Cpu, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Receipt,
  CreditCard,
  Activity
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSales } from "@/hooks/useSales";
import { useMachines } from "@/hooks/useMachines";
import { useMachineExpenses } from "@/hooks/useMachineExpenses";
import { useMachinePayments } from "@/hooks/useMachinePayments";
import { formatCurrency, formatNumber } from "@/lib/numberUtils";



const quickActions = [
  {
    title: "Add New Franchise",
    description: "Register a new franchise partner",
    icon: Building2,
    href: "/franchises"
  },
  {
    title: "Add Machine",
    description: "Register a new gaming machine",
    icon: Cpu,
    href: "/machines"
  },
  {
    title: "Record Expense",
    description: "Add operational expense",
    icon: DollarSign,
    href: "/accounting"
  },
  {
    title: "Manage Users",
    description: "Add or manage system users",
    icon: Users,
    href: "/users"
  }
];

export default function Dashboard() {
  const [filterType, setFilterType] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  const { data: sales } = useSales();
  const { data: machines } = useMachines();
  const { data: expenses } = useMachineExpenses();
  const { data: payments } = useMachinePayments();

  // Filter data based on selected period
  const filteredSales = sales?.filter(sale => {
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
    const paymentDate = new Date(payment.payment_date);
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      return paymentDate.getFullYear() === parseInt(year) && paymentDate.getMonth() === parseInt(month) - 1;
    } else {
      return paymentDate.getFullYear() === parseInt(selectedYear);
    }
  }) || [];

  // Calculations
  const activeMachines = machines?.filter(machine => machine.is_active !== false) || [];
  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.sales_amount || 0), 0);
  
  // Machine-wise sales for highest/lowest
  const machineSales = activeMachines.map(machine => {
    const sales = filteredSales.filter(sale => sale.machine_id === machine.id);
    const total = sales.reduce((sum, sale) => sum + (sale.sales_amount || 0), 0);
    const machineName = sales.length > 0 ? sales[0].machines?.machine_name || machine.machine_name : machine.machine_name;
    return { 
      machine: machine.machine_name, 
      total,
      machineName
    };
  });
  
  const highestMachine = machineSales.length > 0 ? machineSales.reduce((max, current) => current.total > max.total ? current : max) : null;
  const lowestMachine = machineSales.length > 0 ? machineSales.reduce((min, current) => current.total < min.total ? current : min) : null;
  
  const highestMachineSales = highestMachine?.total || 0;
  const lowestMachineSales = lowestMachine?.total || 0;
  const avgSalesPerMachine = activeMachines.length > 0 ? totalSales / activeMachines.length : 0;
  
  const totalPaymentReceived = filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const totalDue = filteredSales.reduce((sum, sale) => sum + ((sale.sales_amount || 0) - (sale.paid_amount || 0)), 0);
  const totalPrizePurchase = filteredExpenses.filter(expense => expense.expense_categories?.category_name === 'Prize Purchase').reduce((sum, expense) => sum + (expense.total_amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.total_amount || 0), 0);

  // Prepare chart data
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = filterType === 'year' ? parseInt(selectedYear) : new Date(selectedMonth).getFullYear();
    
    return months.map((month, index) => {
      const monthSales = sales?.filter(sale => {
        const saleDate = new Date(sale.sales_date);
        return saleDate.getFullYear() === currentYear && saleDate.getMonth() === index;
      }) || [];
      
      const monthExpenses = expenses?.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate.getFullYear() === currentYear && expenseDate.getMonth() === index;
      }) || [];
      
      const salesAmount = monthSales.reduce((sum, sale) => sum + (sale.sales_amount || 0), 0);
      const expensesAmount = monthExpenses.reduce((sum, expense) => sum + (expense.total_amount || 0), 0);
      
      return {
        month,
        sales: salesAmount,
        profit: salesAmount - expensesAmount
      };
    });
  };

  const chartData = getChartData();

  // Format selected period for display
  const getFormattedPeriod = () => {
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return selectedYear;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor your franchise performance and key metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(value: 'month' | 'year') => setFilterType(value)}>
              <SelectTrigger className="w-24 bg-secondary/30 border-border">
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
                className="w-40 bg-secondary/30 border-border"
              />
            ) : (
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                min="2020"
                max="2030"
                className="w-24 bg-secondary/30 border-border"
              />
            )}
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gradient-primary/10 rounded-lg border border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">{activeMachines.length} Active Machines</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success mb-1">
              ৳{formatCurrency(totalSales)}
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredSales.length} transactions
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Highest Machine Sales
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary mb-1">
              ৳{formatCurrency(highestMachineSales)}
            </div>
            <div className="text-sm text-muted-foreground">
              {highestMachine?.machineName ? (highestMachine.total > 0 ? `${highestMachine.machineName} (${getFormattedPeriod()})` : 'No data') : 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lowest Machine Sales
            </CardTitle>
            <ArrowDownRight className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning mb-1">
              ৳{formatCurrency(lowestMachineSales)}
            </div>
            <div className="text-sm text-muted-foreground">
              {lowestMachine?.machineName ? (lowestMachine.total > 0 ? `${lowestMachine.machineName} (${getFormattedPeriod()})` : 'No Data') : 'No data'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Sales per Machine
            </CardTitle>
            <Cpu className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent mb-1">
              ৳{formatCurrency(avgSalesPerMachine)}
            </div>
            <div className="text-sm text-muted-foreground">
              Per active machine
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payment Received
            </CardTitle>
            <CreditCard className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success mb-1">
              ৳{formatCurrency(totalPaymentReceived)}
            </div>
            <div className="text-sm text-muted-foreground">
              Payments received
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Due
            </CardTitle>
            <ArrowUpRight className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning mb-1">
              ৳{formatCurrency(totalDue)}
            </div>
            <div className="text-sm text-muted-foreground">
              Outstanding amount
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Prize Purchase
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary mb-1">
              ৳{formatCurrency(totalPrizePurchase)}
            </div>
            <div className="text-sm text-muted-foreground">
              Prize expenses
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
            <Receipt className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning mb-1">
              ৳{formatCurrency(totalExpenses)}
            </div>
            <div className="text-sm text-muted-foreground">
              All expenses
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Month-Wise Sales</CardTitle>
            <CardDescription>Sales performance throughout the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => `৳${formatNumber(value)}`} />
                <Tooltip 
                  formatter={(value) => [`৳${formatCurrency(value)}`, 'Sales']}
                  labelStyle={{ color: '#1F2937' }}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
                <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Month-Wise Profit</CardTitle>
            <CardDescription>Profit analysis throughout the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => `৳${formatNumber(value)}`} />
                <Tooltip 
                  formatter={(value) => [`৳${formatCurrency(value)}`, 'Profit']}
                  labelStyle={{ color: '#1F2937' }}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
                <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Card key={index} className="bg-gradient-glass border-border shadow-card hover:shadow-neon/10 transition-all duration-200 cursor-pointer group">
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Transactions</CardTitle>
            <CardDescription>Latest financial activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Franchise Payment</p>
                      <p className="text-sm text-muted-foreground">Today at 2:30 PM</p>
                    </div>
                  </div>
                  <span className="text-accent font-medium">+৳15,250</span>
                </div>
              ))}
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