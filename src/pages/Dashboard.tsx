import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Cpu, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const statsCards = [
  {
    title: "Active Franchises",
    value: "12",
    change: "+2 this month",
    icon: Building2,
    trend: "up"
  },
  {
    title: "Total Machines",
    value: "48",
    change: "+5 this month", 
    icon: Cpu,
    trend: "up"
  },
  {
    title: "Monthly Sales",
    value: "৳145,250",
    change: "+12.5% from last month",
    icon: DollarSign,
    trend: "up"
  },
  {
    title: "Monthly Profit",
    value: "৳89,430",
    change: "+8.2% from last month",
    icon: TrendingUp,
    trend: "up"
  },
  {
    title: "Total Expenses",
    value: "৳35,820",
    change: "-5.1% from last month",
    icon: ArrowDownRight,
    trend: "down"
  },
  {
    title: "Inventory Value",
    value: "৳67,890",
    change: "+3.4% from last month",
    icon: Package,
    trend: "up"
  }
];

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
        <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
          <Plus className="h-4 w-4 mr-2" />
          Quick Add
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className={`flex items-center text-sm ${
                stat.trend === 'up' ? 'text-accent' : 'text-warning'
              }`}>
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                )}
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
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