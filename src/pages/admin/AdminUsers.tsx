import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Edit, User, Loader2, IndianRupee, Ban, CheckCircle } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  credits: number;
  is_suspended: boolean;
}

const AdminUsers = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreditsDialogOpen, setIsCreditsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [newUser, setNewUser] = useState({ full_name: '', phone: '', email: '', password: '' });
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', role: '' });
  const [creditsAmount, setCreditsAmount] = useState('');
  const [creditsAction, setCreditsAction] = useState<'add' | 'remove'>('add');
  const [addingUser, setAddingUser] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [processingCredits, setProcessingCredits] = useState(false);

  useEffect(() => {
    // ProtectedRoute already handles auth and role checks
    // Only fetch data when auth is loaded and user has access
    if (!authLoading && user && userRole === 'admin') {
      fetchUsers();
    }
  }, [user, userRole, authLoading]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, created_at, credits')
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
            rides_count: count || 0,
            credits: profile.credits || 0,
            is_suspended: false // We'll add suspension feature later with a proper table
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

  // Handle credits management
  const handleOpenCreditsDialog = (userData: UserData) => {
    setEditingUser(userData);
    setCreditsAmount('');
    setCreditsAction('add');
    setIsCreditsDialogOpen(true);
  };

  const handleUpdateCredits = async () => {
    if (!editingUser || !creditsAmount) return;

    const amount = parseFloat(creditsAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessingCredits(true);
    try {
      const newCredits = creditsAction === 'add' 
        ? editingUser.credits + amount 
        : Math.max(0, editingUser.credits - amount);

      const { error } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success(`Credits ${creditsAction === 'add' ? 'added' : 'removed'} successfully`);
      setIsCreditsDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating credits:', error);
      toast.error(error.message || 'Failed to update credits');
    } finally {
      setProcessingCredits(false);
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

  const handleEditUser = (userData: UserData) => {
    setEditingUser(userData);
    setEditForm({
      full_name: userData.full_name || '',
      phone: userData.phone || '',
      role: userData.role
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;

    setSavingEdit(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          phone: editForm.phone || null
        })
        .eq('id', editingUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (editForm.role !== editingUser.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editForm.role as 'admin' | 'user' | 'driver' })
          .eq('user_id', editingUser.id);

        if (roleError) throw roleError;
      }

      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
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
    { key: 'rides_count', header: 'Rides' },
    { 
      key: 'credits', 
      header: 'Credits',
      render: (item: UserData) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-secondary">₹{item.credits}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2"
            onClick={() => handleOpenCreditsDialog(item)}
          >
            <IndianRupee className="w-3 h-3" />
          </Button>
        </div>
      )
    },
    { key: 'created_at', header: 'Joined' },
    { 
      key: 'actions', 
      header: 'Actions',
      render: (item: UserData) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEditUser(item)}>
            <Edit className="w-4 h-4" />
          </Button>
        </div>
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
    <AdminLayout>
      <div>
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

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input 
                  id="edit-name" 
                  placeholder="Enter full name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input 
                  id="edit-phone" 
                  placeholder="+91 XXXXX XXXXX"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select 
                  value={editForm.role} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Credits Management Dialog */}
        <Dialog open={isCreditsDialogOpen} onOpenChange={setIsCreditsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Credits</DialogTitle>
              <DialogDescription>
                Add or remove credits for {editingUser?.full_name || 'user'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-bold text-secondary">₹{editingUser?.credits || 0}</p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant={creditsAction === 'add' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setCreditsAction('add')}
                >
                  Add Credits
                </Button>
                <Button 
                  variant={creditsAction === 'remove' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setCreditsAction('remove')}
                >
                  Remove Credits
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits-amount">Amount (₹)</Label>
                <Input 
                  id="credits-amount" 
                  type="number"
                  min="0"
                  placeholder="Enter amount"
                  value={creditsAmount}
                  onChange={(e) => setCreditsAmount(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsCreditsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="hero" 
                  className="flex-1" 
                  onClick={handleUpdateCredits}
                  disabled={processingCredits || !creditsAmount}
                >
                  {processingCredits ? <Loader2 className="w-4 h-4 animate-spin" /> : `${creditsAction === 'add' ? 'Add' : 'Remove'} ₹${creditsAmount || 0}`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
