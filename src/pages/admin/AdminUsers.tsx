import React, { useState } from 'react';
import { Search, Plus, Filter, MoreVertical, User, Phone, Mail, MapPin } from 'lucide-react';
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

const users = [
  { 
    id: 'U001', 
    name: 'Ramesh Kumar', 
    phone: '+91 98765 43210', 
    email: 'ramesh@gmail.com',
    village: 'Rampur',
    rides: 23, 
    status: 'Active',
    joined: '15 Jan 2024',
    lastLogin: '2 hours ago',
    device: 'Android',
    ip: '192.168.1.45'
  },
  { 
    id: 'U002', 
    name: 'Priya Sharma', 
    phone: '+91 87654 32109', 
    email: 'priya.s@gmail.com',
    village: 'Sundarpur',
    rides: 45, 
    status: 'Active',
    joined: '20 Dec 2023',
    lastLogin: '30 min ago',
    device: 'iOS',
    ip: '192.168.1.78'
  },
  { 
    id: 'U003', 
    name: 'Amit Roy', 
    phone: '+91 76543 21098', 
    email: 'amit.roy@gmail.com',
    village: 'Krishnanagar',
    rides: 12, 
    status: 'Inactive',
    joined: '05 Feb 2024',
    lastLogin: '5 days ago',
    device: 'Android',
    ip: '192.168.2.12'
  },
  { 
    id: 'U004', 
    name: 'Sunita Devi', 
    phone: '+91 65432 10987', 
    email: 'sunita.d@gmail.com',
    village: 'Rampur',
    rides: 67, 
    status: 'Active',
    joined: '10 Nov 2023',
    lastLogin: '1 hour ago',
    device: 'Android',
    ip: '192.168.1.90'
  },
];

const columns = [
  { 
    key: 'name', 
    header: 'User',
    render: (item: typeof users[0]) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.email}</p>
        </div>
      </div>
    )
  },
  { key: 'phone', header: 'Phone' },
  { key: 'village', header: 'Village' },
  { key: 'rides', header: 'Total Rides' },
  { 
    key: 'status', 
    header: 'Status',
    render: (item: typeof users[0]) => (
      <Badge 
        variant={item.status === 'Active' ? 'default' : 'secondary'}
        className={item.status === 'Active' ? 'bg-primary/10 text-primary' : ''}
      >
        {item.status}
      </Badge>
    )
  },
  { key: 'lastLogin', header: 'Last Login' },
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

const AdminUsers = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users</h1>
            <p className="text-muted-foreground">Manage all registered users</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="w-4 h-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Manually add a new user to the platform
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
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="village">Village</Label>
                  <Input id="village" placeholder="Enter village name" />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Add User
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
              placeholder="Search users..."
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
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold text-foreground">2,847</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Active Today</p>
            <p className="text-2xl font-bold text-primary">1,234</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">New This Week</p>
            <p className="text-2xl font-bold text-secondary">156</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-muted-foreground">89</p>
          </div>
        </div>

        {/* Table */}
        <DataTable columns={columns} data={users} />
      </main>
    </div>
  );
};

export default AdminUsers;
