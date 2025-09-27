import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2,
  Building2,
  MapPin,
  Calendar,
  Activity
} from "lucide-react";

const mockMachines = [
  {
    id: "1",
    machineName: "Claw Master Pro",
    machineNumber: "CM001",
    espId: "ESP_DH_001",
    branchLocation: "Dhaka Central Mall - Ground Floor",
    installationDate: "2024-01-15",
    franchiseName: "Dhaka Central Gaming",
    status: "Active",
    lastReading: "2024-01-25",
    currentCoinCounter: 15420,
    currentPrizeCounter: 3850,
    monthlyRevenue: 18750
  },
  {
    id: "2",
    machineName: "Prize Hunter",
    machineNumber: "PH002", 
    espId: "ESP_DH_002",
    branchLocation: "Dhaka Central Mall - First Floor",
    installationDate: "2024-01-20",
    franchiseName: "Dhaka Central Gaming",
    status: "Active",
    lastReading: "2024-01-25",
    currentCoinCounter: 12350,
    currentPrizeCounter: 2890,
    monthlyRevenue: 14250
  },
  {
    id: "3",
    machineName: "Lucky Grab",
    machineNumber: "LG001",
    espId: "ESP_CT_001", 
    branchLocation: "Chittagong Port City - Level 2",
    installationDate: "2024-02-01",
    franchiseName: "Chittagong Gaming Zone",
    status: "Maintenance",
    lastReading: "2024-01-23",
    currentCoinCounter: 8950,
    currentPrizeCounter: 2100,
    monthlyRevenue: 10580
  },
  {
    id: "4",
    machineName: "Skill Tester",
    machineNumber: "ST001",
    espId: "ESP_SY_001",
    branchLocation: "Sylhet Plaza - Gaming Zone",
    installationDate: "2024-02-10",
    franchiseName: "Sylhet Entertainment", 
    status: "Active",
    lastReading: "2024-01-24",
    currentCoinCounter: 6750,
    currentPrizeCounter: 1450,
    monthlyRevenue: 8920
  }
];

export default function Machines() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMachines = mockMachines.filter(machine =>
    machine.machineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.machineNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    machine.franchiseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-success text-success-foreground';
      case 'Maintenance':
        return 'bg-warning text-warning-foreground';
      case 'Inactive':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Machine Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage gaming machines across all franchises
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-neon">
          <Plus className="h-4 w-4 mr-2" />
          Add Machine
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search machines by name, number, or franchise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border"
            />
          </div>
        </CardContent>
      </Card>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredMachines.map((machine) => (
          <Card key={machine.id} className="bg-gradient-card border-border shadow-card hover:shadow-neon/20 transition-all duration-200">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center shadow-neon-accent">
                    <Cpu className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-foreground">
                      {machine.machineName}
                    </CardTitle>
                    <CardDescription className="text-primary font-medium">
                      {machine.machineNumber} • {machine.espId}
                    </CardDescription>
                  </div>
                </div>
                <Badge className={getStatusColor(machine.status)}>
                  {machine.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Location & Franchise */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-foreground font-medium">{machine.franchiseName}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{machine.branchLocation}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Installed: {new Date(machine.installationDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-primary">
                    {machine.currentCoinCounter.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Coin Count</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-accent">
                    {machine.currentPrizeCounter.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Prize Count</div>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold text-warning">
                    ৳{machine.monthlyRevenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Monthly Rev</div>
                </div>
              </div>

              {/* Last Reading */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Reading:</span>
                </div>
                <span className="text-foreground">
                  {new Date(machine.lastReading).toLocaleDateString()}
                </span>
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {mockMachines.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Machines</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {mockMachines.filter(m => m.status === 'Active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              {mockMachines.filter(m => m.status === 'Maintenance').length}
            </div>
            <div className="text-sm text-muted-foreground">Maintenance</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {mockMachines.reduce((sum, m) => sum + m.currentCoinCounter, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Coins</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-glass border-border shadow-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              ৳{mockMachines.reduce((sum, m) => sum + m.monthlyRevenue, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}