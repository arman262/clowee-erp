import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  Cpu,
  CreditCard,
  DollarSign,
  FileBarChart,
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  TrendingUp,
  Users
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Franchises", url: "/franchises", icon: Building2 },
  { title: "Machines", url: "/machines", icon: Cpu },
  { title: "Counter Readings", url: "/counter-readings", icon: TrendingUp },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Invoices", url: "/invoices", icon: FileText },
];

const financeItems = [
  { title: "Accounting", url: "/accounting", icon: DollarSign },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Expense Categories", url: "/expense-categories", icon: Tag },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Banks", url: "/banks", icon: Landmark },
  { title: "Reports", url: "/monthly-report", icon: FileBarChart },
  { title: "Inventory", url: "/inventory", icon: Package },
];

const systemItems = [
  { title: "Users", url: "/users", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user, userRole, isAdmin } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-r-4 border-primary shadow-lg shadow-primary/20 backdrop-blur-sm relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:rounded-l-lg" 
      : "hover:bg-gradient-to-r hover:from-secondary/30 hover:to-secondary/10 hover:text-primary hover:border-r-2 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 hover:backdrop-blur-sm transition-all duration-300 ease-in-out hover:translate-x-1 relative group";

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} border-r border-border`}>
      <SidebarHeader className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-neon">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          {!collapsed && (
            <div className="flex-1">
              <h1 className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                Clowee ERP
              </h1>
              <p className="text-xs text-muted-foreground">{userRole === 'admin' ? 'Administrator' : 'User'}</p>
            </div>
          )}
        </div>

      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={({ isActive }) => `${getNavCls({ isActive })} ${isActive ? 'active' : ''}`}>
                      {({ isActive }) => (
                        <>
                          <item.icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`} />
                          {!collapsed && (
                            <span className={`transition-all duration-200 group-hover:font-medium ${isActive ? 'font-medium' : ''}`}>
                              {item.title}
                            </span>
                          )}
                          <div className={`absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 transition-opacity duration-300 rounded-l-lg ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Finance</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={({ isActive }) => `${getNavCls({ isActive })} ${isActive ? 'active' : ''}`}>
                      {({ isActive }) => (
                        <>
                          <item.icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`} />
                          {!collapsed && (
                            <span className={`transition-all duration-200 group-hover:font-medium ${isActive ? 'font-medium' : ''}`}>
                              {item.title}
                            </span>
                          )}
                          <div className={`absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 transition-opacity duration-300 rounded-l-lg ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {systemItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={({ isActive }) => `${getNavCls({ isActive })} ${isActive ? 'active' : ''}`}>
                        {({ isActive }) => (
                          <>
                            <item.icon className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'scale-110' : ''}`} />
                            {!collapsed && (
                              <span className={`transition-all duration-200 group-hover:font-medium ${isActive ? 'font-medium' : ''}`}>
                                {item.title}
                              </span>
                            )}
                            <div className={`absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 transition-opacity duration-300 rounded-l-lg ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}