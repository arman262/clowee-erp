import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  MapPin,
  DollarSign
} from "lucide-react";

const mockFranchises = [
  {
    id: "1",
    name: "Dhaka Central Gaming",
    coinPrice: 5,
    dollPrice: 25,
    electricityCost: 500,
    vatPercentage: 7.5,
    franchiseShare: 60,
    cloweeShare: 40,
    paymentDuration: "Monthly",
    totalMachines: 8,
    monthlySales: 45250,
    status: "Active"
  },
  {
    id: "2", 
    name: "Chittagong Gaming Zone",
    coinPrice: 4,
    dollPrice: 20,
    electricityCost: 400,
    vatPercentage: 7.5,
    franchiseShare: 55,
    cloweeShare: 45,
    paymentDuration: "Monthly",
    totalMachines: 6,
    monthlySales: 32150,
    status: "Active"
  },
  {
    id: "3",
    name: "Sylhet Entertainment",
    coinPrice: 4,
    dollPrice: 22,
    electricityCost: 350,
    vatPercentage: 7.5,
    franchiseShare: 65,
    cloweeShare: 35,
    paymentDuration: "Bi-weekly",
    totalMachines: 4,
    monthlySales: 18920,
    status: "Pending"
  }
];

export default function Franchises() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFranchises = mockFranchises.filter(franchise =>
    franchise.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Franchise Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage franchise partners and their gaming operations
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
          <Plus className="h-4 w-4 mr-2" />
          Add Franchise
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search franchises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border"
              />
            </div>
            <Button variant="outline" className="border-border hover:bg-secondary/50">
              Export Data
              <Download className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Franchises Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFranchises.map((franchise) => (
          <Card key={franchise.id} className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center shadow-neon">
                    <Building2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">
                      {franchise.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {franchise.totalMachines} machines
                    </CardDescription>
                  </div>
                </div>
                <Badge 
                  variant={franchise.status === 'Active' ? 'default' : 'secondary'}
                  className={franchise.status === 'Active' ? 'bg-success text-success-foreground' : ''}
                >
                  {franchise.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Monthly Sales</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    ৳{franchise.monthlySales.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Share Split</span>
                  </div>
                  <p className="text-lg font-semibold text-foreground">
                    {franchise.franchiseShare}% / {franchise.cloweeShare}%
                  </p>
                </div>
              </div>

              {/* Pricing Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coin Price:</span>
                  <span className="text-foreground">৳{franchise.coinPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doll Price:</span>
                  <span className="text-foreground">৳{franchise.dollPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="text-foreground">{franchise.paymentDuration}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 border-border hover:bg-secondary/50">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="flex-1 border-border hover:bg-secondary/50">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {mockFranchises.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Franchises</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {mockFranchises.reduce((sum, f) => sum + f.totalMachines, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Machines</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              ৳{mockFranchises.reduce((sum, f) => sum + f.monthlySales, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Monthly Sales</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {mockFranchises.filter(f => f.status === 'Active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Franchises</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}