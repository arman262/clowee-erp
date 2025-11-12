import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/postgres/client";
import { Bar, BarChart, CartesianGrid, Cell, Legend, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/numberUtils";

export default function Reports() {
  const [reportType, setReportType] = useState("sales");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await db.from('machines').select().execute();
      return data || [];
    }
  });
  
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: async () => {
      const data = await db.from('expense_categories').select().execute();
      return data || [];
    }
  });
  
  const years = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" }
  ];
  
  const selectedMachineName = selectedMachine === "all" 
    ? "All Machines" 
    : machines.find((m: any) => String(m.id) === selectedMachine)?.machine_name || "";
  
  const machineRelatedCategories = ["Carrying Cost", "Prize Purchase", "Prize delivery cost", "Conveyance", "Local Accessories", "Import Accessories"];
  const selectedCategoryName = categories.find((c: any) => String(c.id) === selectedCategory)?.category_name?.trim() || "";
  const showMachineDropdown = reportType === "sales" || (reportType === "expense" && (selectedCategory === "all" || machineRelatedCategories.some(cat => cat.toLowerCase() === selectedCategoryName.toLowerCase())));

  const { data: chartData = [] } = useQuery({
    queryKey: ['report-data', reportType, selectedYear, selectedMonth, selectedMachine, selectedCategory],
    queryFn: async () => {
      if (reportType === "sales") {
        const sales = await db.from('sales').select().execute();
        
        const filtered = (sales || []).filter((sale: any) => {
          const saleDate = new Date(sale.sales_date);
          const yearMatch = saleDate.getFullYear().toString() === selectedYear;
          const machineMatch = selectedMachine === "all" || String(sale.machine_id) === selectedMachine;
          return yearMatch && machineMatch;
        });
        
        const monthMap = new Map();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthNames.forEach((month, idx) => monthMap.set(idx, { month, totalSales: 0 }));
        
        filtered.forEach((sale: any) => {
          const month = new Date(sale.sales_date).getMonth();
          monthMap.get(month).totalSales += Number(sale.sales_amount) || 0;
        });
        
        return Array.from(monthMap.values());
      }
      
      if (reportType === "expense") {
        const [expenses, machinesData, categoriesData] = await Promise.all([
          db.from('machine_expenses').select().execute(),
          db.from('machines').select().execute(),
          db.from('expense_categories').select().execute()
        ]);
        
        const categoryMap = new Map();
        (categoriesData || []).forEach((cat: any) => {
          categoryMap.set(cat.id, cat.category_name);
        });
        
        const filtered = (expenses || []).filter((expense: any) => {
          const expenseDate = new Date(expense.expense_date);
          const yearMatch = expenseDate.getFullYear().toString() === selectedYear;
          const monthMatch = selectedMonth === "all" || expenseDate.getMonth().toString() === selectedMonth;
          const machineMatch = selectedMachine === "all" || String(expense.machine_id) === selectedMachine;
          const categoryMatch = selectedCategory === "all" || String(expense.expense_category_id) === selectedCategory;
          return yearMatch && monthMatch && machineMatch && categoryMatch;
        });
        
        const isMachineRelatedCategory = selectedCategory !== "all" && machineRelatedCategories.some(cat => selectedCategoryName.toLowerCase().includes(cat.toLowerCase()));
        
        // If machine-related category and specific machine selected with all months, show month-wise data
        if (isMachineRelatedCategory && selectedMachine !== "all" && selectedMonth === "all") {
          const monthMap = new Map();
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthNames.forEach((month, idx) => monthMap.set(idx, { month, totalExpense: 0 }));
          
          filtered.forEach((expense: any) => {
            const month = new Date(expense.expense_date).getMonth();
            monthMap.get(month).totalExpense += Number(expense.total_amount) || 0;
          });
          
          return Array.from(monthMap.values());
        }
        
        // For machine-related categories with all machines, or non-machine categories, show machine-wise data
        const machineMap = new Map();
        (machinesData || []).forEach((machine: any) => {
          machineMap.set(machine.id, { machineName: machine.machine_name, totalExpense: 0 });
        });
        
        filtered.forEach((expense: any) => {
          if (machineMap.has(expense.machine_id)) {
            machineMap.get(expense.machine_id).totalExpense += Number(expense.total_amount) || 0;
          }
        });
        
        return Array.from(machineMap.values()).filter(item => item.totalExpense > 0);
      }
      
      return [];
    },
    enabled: true
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Sales Reports
        </h1>
        <p className="text-muted-foreground mt-1">Machine-wise sales analysis</p>
      </div>

      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(reportType === "sales" || reportType === "expense") && (
              <>
                <div className="flex-1">
                  <Label>Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reportType === "expense" && (
                  <>
                    <div className="flex-1">
                      <Label>Month</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map(month => (
                            <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label>Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category: any) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.category_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {showMachineDropdown && (
                  <div className="flex-1">
                    <Label>Machine</Label>
                    <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select machine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Machines</SelectItem>
                        {machines.map((machine: any) => (
                          <SelectItem key={machine.id} value={String(machine.id)}>
                            {machine.machine_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedYear(new Date().getFullYear().toString());
                  setSelectedMonth("all");
                  setSelectedMachine("all");
                  setSelectedCategory("all");
                }}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportType === "sales" && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>Monthly Sales Chart - {selectedYear} ({selectedMachineName})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }} style={{ cursor: 'pointer' }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, '']}
                  contentStyle={{ backgroundColor: 'rgba(132, 140, 152, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  wrapperStyle={{ outline: 'none' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend />
                <Bar 
                  dataKey="totalSales" 
                  name="Total Sales (৳)"
                  radius={[8, 8, 0, 0]}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={activeIndex === index ? '#a78bfa' : 'url(#salesGradient)'}
                      style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                      stroke="none"
                    />
                  ))}
                  <LabelList 
                    dataKey="totalSales" 
                    position="top" 
                    formatter={(value: any) => `৳${formatCurrency(Number(value))}`}
                    style={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {reportType === "expense" && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle>
              {selectedMachine !== "all" && selectedMonth === "all" 
                ? `Monthly Expense Chart - ${selectedYear} (${selectedMachineName})`
                : `Machine-Wise Expense Chart - ${selectedYear} ${selectedMonth !== "all" ? `(${months.find(m => m.value === selectedMonth)?.label})` : ''}`
              }
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }} style={{ cursor: 'pointer' }}>
                <defs>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey={selectedMachine !== "all" && selectedMonth === "all" ? "month" : "machineName"} stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={(value) => `৳${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: any) => [`৳${formatCurrency(Number(value))}`, '']}
                  contentStyle={{ backgroundColor: 'rgba(132, 140, 152, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                  wrapperStyle={{ outline: 'none' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Legend />
                <Bar 
                  dataKey="totalExpense" 
                  name="Total Expense (৳)"
                  radius={[8, 8, 0, 0]}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={activeIndex === index ? '#f87171' : 'url(#expenseGradient)'}
                      style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                      stroke="none"
                    />
                  ))}
                  <LabelList 
                    dataKey="totalExpense" 
                    position="top" 
                    formatter={(value: any) => `৳${formatCurrency(Number(value))}`}
                    style={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
