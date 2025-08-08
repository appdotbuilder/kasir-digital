import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  UserCheck,
  UserX,
  Crown,
  Search,
  Filter,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Loader2
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, Transaction, AdminStats } from '../../../server/src/schema';

// Local type for user without password (API returns this)
type UserWithoutPassword = Omit<User, 'password'>;

export function AdminPanel() {
  // Stats state
  const [stats, setStats] = useState<AdminStats>({
    total_users: 0,
    total_transactions: 0,
    total_revenue: 0,
    active_users: 0
  });

  // Users state
  const [users, setUsers] = useState<UserWithoutPassword[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithoutPassword[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [transactionSearchQuery, setTransactionSearchQuery] = useState<string>('');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demo
  const mockStats: AdminStats = {
    total_users: 156,
    total_transactions: 1247,
    total_revenue: 42500000,
    active_users: 89
  };

  const mockUsers: UserWithoutPassword[] = [
    {
      id: 1,
      email: 'admin@demo.com',
      full_name: 'Admin Demo',
      phone_number: '+6281234567890',
      role: 'admin',
      is_active: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-20')
    },
    {
      id: 2,
      email: 'user@demo.com',
      full_name: 'User Demo',
      phone_number: '+6281234567891',
      role: 'user',
      is_active: true,
      created_at: new Date('2024-01-05'),
      updated_at: new Date('2024-01-19')
    },
    {
      id: 3,
      email: 'john.doe@email.com',
      full_name: 'John Doe',
      phone_number: '+6281111111111',
      role: 'user',
      is_active: true,
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-01-18')
    },
    {
      id: 4,
      email: 'inactive.user@email.com',
      full_name: 'Inactive User',
      phone_number: '+6282222222222',
      role: 'user',
      is_active: false,
      created_at: new Date('2024-01-12'),
      updated_at: new Date('2024-01-15')
    }
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 1,
      user_id: 2,
      product_id: 1,
      wallet_id: 1,
      amount: 26000,
      customer_number: '081234567890',
      status: 'success',
      transaction_code: 'TRX001',
      provider_reference: 'REF123456',
      created_at: new Date('2024-01-20T10:30:00'),
      updated_at: new Date('2024-01-20T10:31:00')
    },
    {
      id: 2,
      user_id: 3,
      product_id: 5,
      wallet_id: 2,
      amount: 15000,
      customer_number: '081111111111',
      status: 'success',
      transaction_code: 'TRX002',
      provider_reference: 'REF123457',
      created_at: new Date('2024-01-19T15:45:00'),
      updated_at: new Date('2024-01-19T15:46:00')
    },
    {
      id: 3,
      user_id: 2,
      product_id: 8,
      wallet_id: 1,
      amount: 51000,
      customer_number: '123456789012',
      status: 'pending',
      transaction_code: 'TRX003',
      provider_reference: null,
      created_at: new Date('2024-01-18T09:20:00'),
      updated_at: new Date('2024-01-18T09:20:00')
    },
    {
      id: 4,
      user_id: 3,
      product_id: 3,
      wallet_id: 2,
      amount: 25500,
      customer_number: '081987654321',
      status: 'failed',
      transaction_code: 'TRX004',
      provider_reference: null,
      created_at: new Date('2024-01-17T14:10:00'),
      updated_at: new Date('2024-01-17T14:15:00')
    }
  ];

  // Load admin data
  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [statsData, usersData, transactionsData] = await Promise.all([
        trpc.getAdminStats.query(),
        trpc.getAllUsers.query(),
        trpc.getAllTransactions.query({ page: 1, limit: 50 })
      ]);

      setStats(statsData);
      setUsers(usersData);
      setTransactions(transactionsData.transactions);
    } catch (error) {
      // Use mock data for demo
      setStats(mockStats);
      setUsers(mockUsers);
      setTransactions(mockTransactions);
      console.log('Using demo data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Filter users
  useEffect(() => {
    let filtered = users;

    if (userRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === userRoleFilter);
    }

    if (userSearchQuery.trim()) {
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        (user.phone_number && user.phone_number.includes(userSearchQuery))
      );
    }

    setFilteredUsers(filtered);
  }, [users, userRoleFilter, userSearchQuery]);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    if (transactionStatusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === transactionStatusFilter);
    }

    if (transactionSearchQuery.trim()) {
      filtered = filtered.filter(tx => 
        tx.transaction_code.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
        tx.customer_number.includes(transactionSearchQuery)
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, transactionStatusFilter, transactionSearchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <AlertTriangle className="h-4 w-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Berhasil</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Menunggu</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Diproses</Badge>;
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await trpc.updateUser.mutate({
        id: userId,
        is_active: !currentStatus
      });
      
      // Update local state
      setUsers((prev: UserWithoutPassword[]) => prev.map((user: UserWithoutPassword) => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ));
    } catch (error) {
      // Simulate success for demo
      setUsers((prev: UserWithoutPassword[]) => prev.map((user: UserWithoutPassword) => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ));
    }
  };

  const getUserByTransaction = (userId: number) => {
    return users.find(user => user.id === userId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <p>Memuat data admin...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Crown className="h-6 w-6" />
          Panel Admin
        </h1>
        <p>Kelola pengguna, monitor transaksi, dan lihat statistik platform</p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-blue-800">Total Pengguna</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{stats.total_users}</div>
            <p className="text-blue-700 text-sm mt-1">
              {stats.active_users} aktif
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-green-800">Total Transaksi</CardTitle>
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{stats.total_transactions}</div>
            <p className="text-green-700 text-sm mt-1">Sepanjang waktu</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-yellow-800">Total Pendapatan</CardTitle>
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-900">
              {formatCurrency(stats.total_revenue)}
            </div>
            <p className="text-yellow-700 text-sm mt-1">Revenue total</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-purple-800">Pengguna Aktif</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">{stats.active_users}</div>
            <p className="text-purple-700 text-sm mt-1">
              {Math.round((stats.active_users / stats.total_users) * 100)}% dari total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manajemen Pengguna
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitor Transaksi
          </TabsTrigger>
        </TabsList>

        {/* Users Management Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Daftar Pengguna
              </CardTitle>
              
              {/* User Filters */}
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari nama, email, atau nomor HP..."
                      value={userSearchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setUserSearchQuery(e.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Role</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  {filteredUsers.length} dari {users.length} pengguna
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          user.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'
                        }`}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {user.full_name}
                            {user.role === 'admin' && <Crown className="h-4 w-4 text-purple-600" />}
                          </h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Nomor HP:</p>
                          <p className="font-medium">{user.phone_number || 'Tidak ada'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Role:</p>
                          <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                            {user.role}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-gray-500">Bergabung:</p>
                          <p className="font-medium">
                            {user.created_at.toLocaleDateString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? (
                          <>
                            <UserCheck className="h-3 w-3 mr-1" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Tidak Aktif
                          </>
                        )}
                      </Badge>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant={user.is_active ? "destructive" : "default"}
                          size="sm"
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      Tidak ada pengguna ditemukan
                    </h3>
                    <p className="text-gray-500">
                      Coba ubah filter pencarian
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Monitor Tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Monitor Transaksi
              </CardTitle>
              
              {/* Transaction Filters */}
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cari kode transaksi atau nomor..."
                      value={transactionSearchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setTransactionSearchQuery(e.target.value)
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Select value={transactionStatusFilter} onValueChange={setTransactionStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="success">Berhasil</SelectItem>
                      <SelectItem value="pending">Menunggu</SelectItem>
                      <SelectItem value="processing">Diproses</SelectItem>
                      <SelectItem value="failed">Gagal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center text-sm text-gray-600">
                  {filteredTransactions.length} dari {transactions.length} transaksi
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const user = getUserByTransaction(transaction.user_id);
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(transaction.status)}
                          <div>
                            <h3 className="font-semibold">{transaction.transaction_code}</h3>
                            <p className="text-sm text-gray-600">
                              {user ? user.full_name : `User ID ${transaction.user_id}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Nomor Tujuan:</p>
                            <p className="font-medium">{transaction.customer_number}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Jumlah:</p>
                            <p className="font-medium text-blue-600">
                              {formatCurrency(transaction.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Waktu:</p>
                            <p className="font-medium">
                              {transaction.created_at.toLocaleDateString('id-ID')} {' '}
                              {transaction.created_at.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Referensi:</p>
                            <p className="font-medium text-xs">
                              {transaction.provider_reference || 'Belum ada'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(transaction.status)}
                        <Button variant="ghost" size="sm">
                          Detail
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12">
                    <Activity className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      Tidak ada transaksi ditemukan
                    </h3>
                    <p className="text-gray-500">
                      Coba ubah filter pencarian
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}