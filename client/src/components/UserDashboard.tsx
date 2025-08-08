import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Smartphone, 
  CreditCard, 
  History, 
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import components
import { WalletSection } from '@/components/WalletSection';
import { ProductCatalog } from '@/components/ProductCatalog';
import { TransactionHistory } from '@/components/TransactionHistory';

import type { User } from '../../../server/src/schema';

// Local type for user without password
type UserWithoutPassword = Omit<User, 'password'>;

interface UserDashboardProps {
  user: UserWithoutPassword;
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  // Load wallet balance
  const loadWalletBalance = useCallback(async () => {
    try {
      setIsLoadingBalance(true);
      const balance = await trpc.getWalletBalance.query();
      setWalletBalance(balance.balance);
    } catch (error) {
      // Simulate wallet balance for demo
      setWalletBalance(250000); // Default demo balance
      console.log('Using demo balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    loadWalletBalance();
  }, [loadWalletBalance]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Wallet Balance Card */}
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Saldo Dompet</CardTitle>
              <Wallet className="h-5 w-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">
              {isLoadingBalance ? '...' : formatCurrency(walletBalance)}
            </div>
            <p className="text-blue-100 text-sm">Tersedia untuk transaksi</p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Transaksi Hari Ini</CardTitle>
              <TrendingUp className="h-5 w-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">3</div>
            <p className="text-green-100 text-sm">Transaksi berhasil</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-600 to-purple-700 text-white border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Status Akun</CardTitle>
              <CheckCircle className="h-5 w-5 opacity-80" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">Aktif</div>
            <p className="text-purple-100 text-sm">Semua fitur tersedia</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Produk
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Dompet
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Riwayat
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Profil
          </TabsTrigger>
        </TabsList>

        {/* Product Catalog Tab */}
        <TabsContent value="products">
          <ProductCatalog 
            userBalance={walletBalance} 
            onTransactionSuccess={loadWalletBalance}
          />
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet">
          <WalletSection 
            balance={walletBalance} 
            onBalanceUpdate={loadWalletBalance}
          />
        </TabsContent>

        {/* Transaction History Tab */}
        <TabsContent value="transactions">
          <TransactionHistory userId={user.id} />
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nama Lengkap</label>
                  <p className="text-lg">{user.full_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Nomor HP</label>
                  <p className="text-lg">{user.phone_number || 'Belum diatur'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status Akun</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Bergabung Sejak</label>
                  <p className="text-lg">{user.created_at.toLocaleDateString('id-ID')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Keamanan Akun</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Email Terverifikasi</p>
                    <p className="text-sm text-green-600">Akun Anda aman</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Ubah Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Update Nomor HP
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Tips Keamanan:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Gunakan password yang kuat</li>
                    <li>• Jangan bagikan data login Anda</li>
                    <li>• Selalu logout setelah selesai</li>
                    <li>• Periksa riwayat transaksi secara berkala</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}