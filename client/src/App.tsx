import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wallet, Shield, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import './App.css';

// Import components
import { AuthForm } from '@/components/AuthForm';
import { UserDashboard } from '@/components/UserDashboard';
import { AdminPanel } from '@/components/AdminPanel';

// Import types
import type { User } from '../../server/src/schema';

// Local type for user without password (since API returns this)
type UserWithoutPassword = Omit<User, 'password'>;

function App() {
  const [currentUser, setCurrentUser] = useState<UserWithoutPassword | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on load
  useEffect(() => {
    // Simulate session check - in real app this would validate actual session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = useCallback((user: UserWithoutPassword) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Memuat aplikasi...</p>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <Smartphone className="h-10 w-10 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">PulsaKu Digital</h1>
            </div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Platform kasir digital terpercaya untuk pembelian pulsa, paket data, 
              dan produk digital lainnya dengan sistem dompet yang aman.
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Wallet className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-xl">Dompet Digital</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Kelola saldo dengan mudah, deposit instan, dan riwayat transaksi lengkap.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Smartphone className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-xl">Produk Lengkap</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Pulsa semua operator, paket data, token listrik, dan produk digital lainnya.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <Shield className="h-12 w-12 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-xl">Aman & Terpercaya</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Transaksi aman dengan enkripsi tingkat bank dan customer service 24/7.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Authentication Form */}
          <div className="max-w-md mx-auto">
            <AuthForm onLogin={handleLogin} />
          </div>

          {/* Demo Info */}
          <div className="mt-8 text-center">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-amber-800">Mode Demo</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Aplikasi ini menggunakan data simulasi. Semua transaksi dan deposit hanya untuk demonstrasi.
                    Akun admin tersedia dengan email: admin@demo.com, password: admin123
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main application for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Smartphone className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">PulsaKu Digital</h1>
                <p className="text-sm text-gray-500">
                  Selamat datang, {currentUser.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={currentUser.role === 'admin' ? 'destructive' : 'default'}>
                {currentUser.role === 'admin' ? 'Admin' : 'User'}
              </Badge>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="text-sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {currentUser.role === 'admin' ? (
          <AdminPanel />
        ) : (
          <UserDashboard user={currentUser} />
        )}
      </div>
    </div>
  );
}

export default App;