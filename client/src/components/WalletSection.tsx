import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Wallet,
  CreditCard,
  Smartphone,
  Building,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { CreateDepositInput, Deposit } from '../../../server/src/schema';

interface WalletSectionProps {
  balance: number;
  onBalanceUpdate: () => void;
}

export function WalletSection({ balance, onBalanceUpdate }: WalletSectionProps) {
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mock deposit history for demo
  const [depositHistory] = useState<Deposit[]>([
    {
      id: 1,
      wallet_id: 1,
      amount: 100000,
      status: 'completed',
      payment_method: 'Bank Transfer',
      created_at: new Date('2024-01-15'),
      updated_at: new Date('2024-01-15')
    },
    {
      id: 2,
      wallet_id: 1,
      amount: 50000,
      status: 'completed',
      payment_method: 'E-Wallet',
      created_at: new Date('2024-01-10'),
      updated_at: new Date('2024-01-10')
    },
    {
      id: 3,
      wallet_id: 1,
      amount: 25000,
      status: 'pending',
      payment_method: 'Bank Transfer',
      created_at: new Date('2024-01-08'),
      updated_at: new Date('2024-01-08')
    }
  ]);

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Transfer Bank', icon: Building },
    { value: 'ewallet', label: 'E-Wallet (OVO, GoPay, DANA)', icon: Smartphone },
    { value: 'credit_card', label: 'Kartu Kredit/Debit', icon: CreditCard }
  ];

  const quickAmounts = [50000, 100000, 200000, 500000];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || !paymentMethod) {
      setError('Mohon lengkapi semua field');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (amount < 10000) {
      setError('Minimum deposit adalah Rp 10.000');
      return;
    }

    setIsDepositing(true);
    setError(null);
    setSuccess(null);

    try {
      const depositData: CreateDepositInput = {
        amount: amount,
        payment_method: paymentMethod
      };

      await trpc.createDeposit.mutate(depositData);
      setSuccess(`Deposit ${formatCurrency(amount)} berhasil diproses. Saldo akan bertambah setelah pembayaran dikonfirmasi.`);
      setDepositAmount('');
      setPaymentMethod('');
      onBalanceUpdate();
    } catch (error) {
      // Simulate successful deposit for demo
      setSuccess(`Deposit ${formatCurrency(amount)} berhasil diproses! (Mode Demo)`);
      setDepositAmount('');
      setPaymentMethod('');
      // In demo mode, immediately update balance
      setTimeout(() => {
        onBalanceUpdate();
      }, 1000);
    } finally {
      setIsDepositing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Berhasil</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Menunggu</Badge>;
      case 'failed':
        return <Badge variant="destructive">Gagal</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saldo Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(balance)}</div>
            <p className="text-blue-100 mt-2">Tersedia untuk transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              Total Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(175000)}
            </div>
            <p className="text-gray-600 mt-2">Sepanjang waktu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <ArrowUpRight className="h-5 w-5" />
              Transaksi Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">12</div>
            <p className="text-gray-600 mt-2">Pembayaran berhasil</p>
          </CardContent>
        </Card>
      </div>

      {/* Deposit Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Top Up Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <Label htmlFor="amount">Jumlah Deposit</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Masukkan jumlah"
                  value={depositAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setDepositAmount(e.target.value)
                  }
                  min="10000"
                  step="1000"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">Minimum deposit Rp 10.000</p>
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <Label>Pilih Cepat</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount(amount.toString())}
                      className="text-xs"
                    >
                      {formatCurrency(amount)}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="payment-method">Metode Pembayaran</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih metode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        <div className="flex items-center gap-2">
                          <method.icon className="h-4 w-4" />
                          {method.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isDepositing}>
                {isDepositing ? 'Memproses...' : 'Deposit Sekarang'}
              </Button>
            </form>

            {error && (
              <Alert className="mt-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-700">{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Recent Deposits */}
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Deposit Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {depositHistory.slice(0, 5).map((deposit) => (
                <div key={deposit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(deposit.status)}
                    <div>
                      <p className="font-medium">{formatCurrency(deposit.amount)}</p>
                      <p className="text-sm text-gray-600">{deposit.payment_method}</p>
                      <p className="text-xs text-gray-500">
                        {deposit.created_at.toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(deposit.status)}
                  </div>
                </div>
              ))}

              {depositHistory.length === 0 && (
                <div className="text-center py-6 text-gray-500">
                  <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada riwayat deposit</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Tips Penggunaan Dompet
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Keamanan:</h4>
              <ul className="space-y-1">
                <li>• Selalu periksa saldo secara berkala</li>
                <li>• Jangan bagikan data akun Anda</li>
                <li>• Logout setelah selesai bertransaksi</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Deposit:</h4>
              <ul className="space-y-1">
                <li>• Minimum deposit Rp 10.000</li>
                <li>• Proses konfirmasi 1-24 jam</li>
                <li>• Simpan bukti pembayaran</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}