import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  History,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Smartphone,
  Loader2
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Transaction } from '../../../server/src/schema';

interface TransactionHistoryProps {
  userId: number;
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Mock transaction data for demo
  const mockTransactions: Transaction[] = [
    {
      id: 1,
      user_id: userId,
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
      user_id: userId,
      product_id: 5,
      wallet_id: 1,
      amount: 15000,
      customer_number: '081234567890',
      status: 'success',
      transaction_code: 'TRX002',
      provider_reference: 'REF123457',
      created_at: new Date('2024-01-19T15:45:00'),
      updated_at: new Date('2024-01-19T15:46:00')
    },
    {
      id: 3,
      user_id: userId,
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
      user_id: userId,
      product_id: 3,
      wallet_id: 1,
      amount: 25500,
      customer_number: '081987654321',
      status: 'failed',
      transaction_code: 'TRX004',
      provider_reference: null,
      created_at: new Date('2024-01-17T14:10:00'),
      updated_at: new Date('2024-01-17T14:15:00')
    },
    {
      id: 5,
      user_id: userId,
      product_id: 6,
      wallet_id: 1,
      amount: 35000,
      customer_number: '081555666777',
      status: 'success',
      transaction_code: 'TRX005',
      provider_reference: 'REF123458',
      created_at: new Date('2024-01-16T11:30:00'),
      updated_at: new Date('2024-01-16T11:32:00')
    }
  ];

  // Mock product names for display
  const productNames: { [key: number]: string } = {
    1: 'Pulsa Telkomsel 25K',
    3: 'Pulsa XL 25K',
    5: 'Telkomsel 1GB 30 Hari',
    6: 'Telkomsel 3GB 30 Hari',
    8: 'Token PLN 50K'
  };

  // Load transaction history
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await trpc.getUserTransactions.query({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter !== 'all' ? statusFilter as any : undefined
      });
      
      setTransactions(response.transactions);
      setTotalPages(Math.ceil(response.total_count / itemsPerPage));
    } catch (error) {
      // Use mock data for demo
      setTransactions(mockTransactions);
      setTotalPages(Math.ceil(mockTransactions.length / itemsPerPage));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, userId, itemsPerPage]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(tx => 
        tx.transaction_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.customer_number.includes(searchQuery) ||
        (productNames[tx.product_id] && 
         productNames[tx.product_id].toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(tx => tx.created_at >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(tx => tx.created_at >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(tx => tx.created_at >= filterDate);
          break;
      }
    }

    setFilteredTransactions(filtered);
  }, [transactions, statusFilter, searchQuery, dateFilter]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-l-green-500 bg-green-50';
      case 'pending':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'processing':
        return 'border-l-blue-500 bg-blue-50';
      case 'failed':
        return 'border-l-red-500 bg-red-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Berhasil</p>
                <p className="text-2xl font-bold text-green-800">
                  {transactions.filter(tx => tx.status === 'success').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Menunggu</p>
                <p className="text-2xl font-bold text-yellow-800">
                  {transactions.filter(tx => tx.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Gagal</p>
                <p className="text-2xl font-bold text-red-800">
                  {transactions.filter(tx => tx.status === 'failed').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Total Transaksi</p>
                <p className="text-2xl font-bold text-blue-800">{transactions.length}</p>
              </div>
              <History className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Riwayat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Cari Transaksi</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Kode transaksi, nomor HP..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setSearchQuery(e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
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

            <div>
              <Label htmlFor="date">Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">7 Hari Terakhir</SelectItem>
                  <SelectItem value="month">30 Hari Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Ekspor
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Riwayat Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
              <p>Memuat riwayat transaksi...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Tidak ada transaksi ditemukan
              </h3>
              <p className="text-gray-500">
                Belum ada transaksi yang sesuai dengan filter yang dipilih
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className={`border-l-4 p-4 rounded-lg ${getStatusColor(transaction.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(transaction.status)}
                        <div>
                          <h3 className="font-semibold">
                            {productNames[transaction.product_id] || `Produk ID ${transaction.product_id}`}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Kode: {transaction.transaction_code}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
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
                      </div>

                      {transaction.provider_reference && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            Referensi Provider: {transaction.provider_reference}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(transaction.status)}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Detail
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Halaman {currentPage} dari {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}