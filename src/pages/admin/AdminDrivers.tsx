import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, Car, Star, CheckCircle, XCircle } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const drivers = [
  { 
    id: 'D001', 
    name: 'Suresh Mahato', 
    phone: '+91 98765 11111', 
    vehicle: 'WB 12 A 3456',
    type: 'Passenger',
    rating: 4.8,
    rides: 234, 
    earnings: 45000,
    status: 'Online',
    verified: true,
    joined: '10 Oct 2023',
  },
  { 
    id: 'D002', 
    name: 'Mohan Lal', 
    phone: '+91 87654 22222', 
    vehicle: 'WB 14 B 7890',
    type: 'Both',
    rating: 4.5,
    rides: 189, 
    earnings: 38000,
    status: 'Offline',
    verified: true,
    joined: '25 Nov 2023',
  },
  { 
    id: 'D003', 
    name: 'Raju Kumar', 
    phone: '+91 76543 33333', 
    vehicle: 'WB 11 C 4567',
    type: 'Goods',
    rating: 4.9,
    rides: 312, 
    earnings: 62000,
    status: 'Online',
    verified: true,
    joined: '05 Sep 2023',
  },
  { 
    id: 'D004', 
    name: 'Vijay Prasad', 
    phone: '+91 65432 44444', 
    vehicle: 'WB 15 D 1234',
    type: 'Passenger',
    rating: 4.2,
    rides: 78, 
    earnings: 15000,
    status: 'Pending',
    verified: false,
    joined: '01 Mar 2024',
  },
];

const columns = [
  { 
    key: 'name', 
    header: 'Driver',
    render: (item: typeof drivers[0]) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
          <Car className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{item.name}</p>
            {item.verified && (
              <CheckCircle className="w-4 h-4 text-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{item.vehicle}</p>
        </div>
      </div>
    )
  },
  { key: 'phone', header: 'Phone' },
  { 
    key: 'type', 
    header: 'Type',
    render: (item: typeof drivers[0]) => (
      <Badge variant="secondary">{item.type}</Badge>
    )
  },
  { 
    key: 'rating', 
    header: 'Rating',
    render: (item: typeof drivers[0]) => (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 text-secondary fill-secondary" />
        <span className="font-medium">{item.rating}</span>
      </div>
    )
  },
  { key: 'rides', header: 'Rides' },
  { 
    key: 'earnings', 
    header: 'Earnings',
    render: (item: typeof drivers[0]) => (
      <span className="font-medium">₹{item.earnings.toLocaleString()}</span>
    )
  },
  { 
    key: 'status', 
    header: 'Status',
    render: (item: typeof drivers[0]) => (
      <Badge 
        variant={
          item.status === 'Online' ? 'default' : 
          item.status === 'Pending' ? 'secondary' : 
          'outline'
        }
        className={
          item.status === 'Online' ? 'bg-primary/10 text-primary' :
          item.status === 'Pending' ? 'bg-secondary/10 text-secondary' : ''
        }
      >
        {item.status}
      </Badge>
    )
  },
  { 
    key: 'actions', 
    header: '',
    render: () => (
      <Button variant="ghost" size="icon">
        <MoreVertical className="w-4 h-4" />
      </Button>
    )
  },
];

const AdminDrivers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Drivers</h1>
            <p className="text-muted-foreground">Manage all registered drivers</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
                <DialogDescription>
                  Manually register a new driver
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Enter full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle Number</Label>
                  <Input id="vehicle" placeholder="WB XX X XXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license">License Number</Label>
                  <Input id="license" placeholder="Enter license number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Service Type</Label>
                  <select id="type" className="w-full h-10 px-3 rounded-lg border border-input bg-background">
                    <option value="passenger">Passenger Only</option>
                    <option value="goods">Goods Only</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Add Driver
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Total Drivers</p>
            <p className="text-2xl font-bold text-foreground">524</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Online Now</p>
            <p className="text-2xl font-bold text-primary">156</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Pending Verification</p>
            <p className="text-2xl font-bold text-secondary">23</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Avg Rating</p>
            <p className="text-2xl font-bold text-foreground flex items-center gap-1">
              <Star className="w-5 h-5 text-secondary fill-secondary" />
              4.6
            </p>
          </div>
        </div>

        {/* Table */}
        <DataTable columns={columns} data={drivers} />
      </main>
    </div>
  );
};

export default AdminDrivers;
