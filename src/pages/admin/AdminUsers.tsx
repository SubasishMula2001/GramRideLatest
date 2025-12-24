import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, MoreVertical, User, Loader2, Trash2 } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserData {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  created_at: string;
  rides_count: number;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', phone: '', email: '', password: '' });
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user || userRole !== 'admin') {
        navigate('/login');
        return;
      }
      fetchUsers();
    }
  }, [user, userRole, authLoading]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const profileIds = (profiles || []).map((p) => p.id);

      const rolesResult = profileIds.length
        ? await supabase.from('user_roles').select('user_id, role').in('user_id', profileIds)
        : { data: [], error: null };

      const rolesData = rolesResult.data as any[];
      const rolesError = rolesResult.error;

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      const roleRank: Record<string, number> = { user: 1, driver: 2, admin: 3 };
      const roleByUserId = new Map<string, string>();

      (rolesData || []).forEach((r: any) => {
        const prev = roleByUserId.get(r.user_id);
        if (!prev || roleRank[r.role] > roleRank[prev]) {
          roleByUserId.set(r.user_id, r.role);
        }
      });

      // Get ride counts for each user
      const usersWithCounts = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { count } = await supabase
            .from('rides')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            full_name: profile.full_name,
            phone: profile.phone,
            email: profile.email,
            role: roleByUserId.get(profile.id) || 'user',
            created_at: new Date(profile.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }),
            rides_count: count || 0
          };
        })
      );

      setUsers(usersWithCounts);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error('Email and password are required');
      return;
    }

    setAddingUser(true);
    try {
      const response = await supabase.functions.invoke('create-demo-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          fullName: newUser.full_name,
          role: 'user'
        }
      });

      if (response.error) throw response.error;

      toast.success('User added successfully');
      setIsAddDialogOpen(false);
      setNewUser({ full_name: '', phone: '', email: '', password: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.message || 'Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery)
  );

  const columns = [
    { 
      key: 'full_name', 
      header: 'User',
      render: (item: UserData) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{item.full_name || 'No Name'}</p>
            <p className="text-sm text-muted-foreground">{item.email}</p>
          </div>
        </div>
      )
    },
    { key: 'phone', header: 'Phone', render: (item: UserData) => item.phone || '--' },
    { 
      key: 'role', 
      header: 'Role',
      render: (item: UserData) => (
        <Badge variant={item.role === 'admin' ? 'default' : item.role === 'driver' ? 'secondary' : 'outline'}>
          {item.role}
        </Badge>
      )
    },
    { key: 'rides_count', header: 'Total Rides' },
    { key: 'created_at', header: 'Joined' },
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalUsers = users.length;
  const activeToday = users.filter(u => u.role === 'user').length;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const driverCount = users.filter(u => u.role === 'driver').length;

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
                  <Input 
                    id="name" 
                    placeholder="Enter full name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="user@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Min 6 characters"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="+91 XXXXX XXXXX"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="hero" 
                    className="flex-1" 
                    onClick={handleAddUser}
                    disabled={addingUser}
                  >
                    {addingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add User'}
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
            <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Regular Users</p>
            <p className="text-2xl font-bold text-primary">{activeToday}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Drivers</p>
            <p className="text-2xl font-bold text-secondary">{driverCount}</p>
          </div>
          <div className="bg-gradient-card rounded-xl border border-border/50 p-4">
            <p className="text-sm text-muted-foreground">Admins</p>
            <p className="text-2xl font-bold text-accent">{adminCount}</p>
          </div>
        </div>

        {/* Table */}
        {filteredUsers.length > 0 ? (
          <DataTable columns={columns} data={filteredUsers} />
        ) : (
          <div className="bg-gradient-card rounded-xl border border-border/50 p-12 text-center">
            <p className="text-muted-foreground">No users found</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminUsers;
