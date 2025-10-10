import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  CreditCard
} from "lucide-react";
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { data: sales } = useSales();
  const { data: machines } = useMachines();
  const { data: expenses } = useMachineExpenses();
  const { data: payments } = useMachinePayments();

  // Date calculations
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const lastMonth = new Date(currentYear, currentMonth - 1);
  const secondHalfLastMonth = new Date(currentYear, currentMonth - 1, 16);
  const endLastMonth = new Date(currentYear, currentMonth, 0);
  
  // Filter functions
  const todaySales = sales?.filter(sale => sale.sales_date?.split('T')[0] === today) || [];
  const secondHalfSales = sales?.filter(sale => {
    const saleDate = new Date(sale.sales_date);
    return saleDate >= secondHalfLastMonth && saleDate <= endLastMonth;
  }) || [];
  const lastMonthSales = sales?.filter(sale => {
    const saleDate = new Date(sale.sales_date);
    return saleDate.getMonth() === lastMonth.getMonth() && saleDate.getFullYear() === lastMonth.getFullYear();
  }) || [];
  const thisYearSales = sales?.filter(sale => {
    const saleDate = new Date(sale.sales_date);
    return saleDate.getFullYear() === currentYear;
  }) || [];
  const lastMonthExpenses = expenses?.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate.getMonth() === lastMonth.getMonth() && expenseDate.getFullYear() === lastMonth.getFullYear();
  }) || [];
  const thisMonthPayments = payments?.filter(payment => {
    const paymentDate = new Date(payment.payment_date);
    return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
  }) || [];

  // Calculations
  const activeMachines = machines?.filter(machine => machine.is_active !== false) || [];
  const todayTotal = todaySales.reduce((sum, sale) => sum + (sale.sales_amount || 0), 0);
  const secondHalfTotal = secondHalfSales.reduce((sum, sale) => sum + (sale.sales_amount || 0), 0);
  const lastMonthTotal = lastMonthSales.reduce((sum, sale) => sum + (sale.sales_amount || 0), 0);
  const thisYearTotal = thisYearSales.reduce((sum, sale) => sum + (sale.sales_amount || 0), 0);
  const lastMonthExpenseTotal = lastMonthExpenses.reduce((sum, expense) => sum + (expense.total_amount || 0), 0);
  const thisMonthPaymentTotal = thisMonthPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

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
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40 bg-secondary/30 border-border"
            />
          </div>
          <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
            <Plus className="h-4 w-4 mr-2" />
            Quick Add
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Machines
            </CardTitle>
            <Cpu className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {activeMachines.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Total active machines
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today Sales
            </CardTitle>
            <DollarSign className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success mb-1">
              ৳{formatCurrency(todayTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              {todaySales.length} transactions today
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              2nd Half Last Month
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent mb-1">
              ৳{formatCurrency(secondHalfTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              {lastMonth.toLocaleDateString('en-US', { month: 'short' })} 16-{endLastMonth.getDate()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Month Sales
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary mb-1">
              ৳{formatCurrency(lastMonthTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              {lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Year Sales
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success mb-1">
              ৳{formatCurrency(thisYearTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              Year {currentYear}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Month Expenses
            </CardTitle>
            <Receipt className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning mb-1">
              ৳{formatCurrency(lastMonthExpenseTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              {lastMonth.toLocaleDateString('en-US', { month: 'long' })} expenses
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month Payments
            </CardTitle>
            <CreditCard className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent mb-1">
              ৳{formatCurrency(thisMonthPaymentTotal)}
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { month: 'long' })} payments
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inventory Value
            </CardTitle>
            <Package className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary mb-1">
              ৳67,890
            </div>
            <div className="text-sm text-muted-foreground">
              Current inventory value
            </div>
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