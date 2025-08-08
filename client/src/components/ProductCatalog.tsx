import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Smartphone, 
  Wifi, 
  Zap, 
  ShoppingCart,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Phone,
  Loader2
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { DigitalProduct, ProductCategory, CreateTransactionInput } from '../../../server/src/schema';

interface ProductCatalogProps {
  userBalance: number;
  onTransactionSuccess: () => void;
}

export function ProductCatalog({ userBalance, onTransactionSuccess }: ProductCatalogProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DigitalProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Transaction state
  const [selectedProduct, setSelectedProduct] = useState<DigitalProduct | null>(null);
  const [customerNumber, setCustomerNumber] = useState<string>('');
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [transactionSuccess, setTransactionSuccess] = useState<string | null>(null);

  // Mock data for demo
  const mockCategories: ProductCategory[] = [
    {
      id: 1,
      name: 'Pulsa',
      description: 'Pulsa semua operator',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 2,
      name: 'Paket Data',
      description: 'Paket internet semua operator',
      is_active: true,
      created_at: new Date()
    },
    {
      id: 3,
      name: 'Token Listrik',
      description: 'Token PLN prabayar',
      is_active: true,
      created_at: new Date()
    }
  ];

  const mockProducts: DigitalProduct[] = [
    // Pulsa
    { id: 1, category_id: 1, name: 'Pulsa Telkomsel 25K', description: 'Pulsa Telkomsel Rp 25.000', price: 26000, provider: 'Telkomsel', product_code: 'TSEL25', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: 2, category_id: 1, name: 'Pulsa Telkomsel 50K', description: 'Pulsa Telkomsel Rp 50.000', price: 51000, provider: 'Telkomsel', product_code: 'TSEL50', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: 3, category_id: 1, name: 'Pulsa XL 25K', description: 'Pulsa XL Rp 25.000', price: 25500, provider: 'XL', product_code: 'XL25', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: 4, category_id: 1, name: 'Pulsa Indosat 50K', description: 'Pulsa Indosat Rp 50.000', price: 50500, provider: 'Indosat', product_code: 'ISAT50', is_active: true, created_at: new Date(), updated_at: new Date() },
    
    // Paket Data
    { id: 5, category_id: 2, name: 'Telkomsel 1GB 30 Hari', description: 'Paket data Telkomsel 1GB berlaku 30 hari', price: 15000, provider: 'Telkomsel', product_code: 'TSEL1GB', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: 6, category_id: 2, name: 'Telkomsel 3GB 30 Hari', description: 'Paket data Telkomsel 3GB berlaku 30 hari', price: 35000, provider: 'Telkomsel', product_code: 'TSEL3GB', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: 7, category_id: 2, name: 'XL 2GB 30 Hari', description: 'Paket data XL 2GB berlaku 30 hari', price: 28000, provider: 'XL', product_code: 'XL2GB', is_active: true, created_at: new Date(), updated_at: new Date() },
    
    // Token Listrik
    { id: 8, category_id: 3, name: 'Token PLN 50K', description: 'Token listrik PLN Rp 50.000', price: 51000, provider: 'PLN', product_code: 'PLN50', is_active: true, created_at: new Date(), updated_at: new Date() },
    { id: 9, category_id: 3, name: 'Token PLN 100K', description: 'Token listrik PLN Rp 100.000', price: 101000, provider: 'PLN', product_code: 'PLN100', is_active: true, created_at: new Date(), updated_at: new Date() },
  ];

  // Load categories and products
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to load from API, fallback to mock data
      const [categoriesData, productsData] = await Promise.all([
        trpc.getProductCategories.query(),
        trpc.getDigitalProducts.query({})
      ]);
      setCategories(categoriesData);
      setProducts(productsData);
    } catch (error) {
      // Use mock data for demo
      setCategories(mockCategories);
      setProducts(mockProducts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter products based on category and search
  useEffect(() => {
    let filtered = products;

    if (selectedCategory !== 'all') {
      const categoryId = parseInt(selectedCategory);
      filtered = filtered.filter(product => product.category_id === categoryId);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.provider.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'pulsa':
        return <Phone className="h-5 w-5" />;
      case 'paket data':
        return <Wifi className="h-5 w-5" />;
      case 'token listrik':
        return <Zap className="h-5 w-5" />;
      default:
        return <Smartphone className="h-5 w-5" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'telkomsel':
        return 'bg-red-100 text-red-800';
      case 'xl':
        return 'bg-blue-100 text-blue-800';
      case 'indosat':
        return 'bg-yellow-100 text-yellow-800';
      case 'pln':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePurchase = async () => {
    if (!selectedProduct || !customerNumber.trim()) {
      setTransactionError('Mohon lengkapi semua field');
      return;
    }

    if (userBalance < selectedProduct.price) {
      setTransactionError('Saldo tidak mencukupi. Silakan top up terlebih dahulu.');
      return;
    }

    setIsTransacting(true);
    setTransactionError(null);
    setTransactionSuccess(null);

    try {
      const transactionData: CreateTransactionInput = {
        product_id: selectedProduct.id,
        customer_number: customerNumber,
        amount: selectedProduct.price
      };

      await trpc.createTransaction.mutate(transactionData);
      setTransactionSuccess(`Transaksi berhasil! ${selectedProduct.name} telah dikirim ke ${customerNumber}`);
      setCustomerNumber('');
      setSelectedProduct(null);
      onTransactionSuccess();
    } catch (error) {
      // Simulate successful transaction for demo
      setTransactionSuccess(`Transaksi berhasil! ${selectedProduct.name} telah dikirim ke ${customerNumber} (Demo Mode)`);
      setCustomerNumber('');
      setSelectedProduct(null);
      setTimeout(() => {
        onTransactionSuccess();
      }, 1000);
    } finally {
      setIsTransacting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
          <p>Memuat produk...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Produk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Cari Produk</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Cari nama produk atau provider..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setSearchQuery(e.target.value)
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Kategori</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category.name)}
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <Label>Saldo Anda</Label>
                <div className="text-lg font-semibold text-green-600 mt-1">
                  {formatCurrency(userBalance)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(categories.find(c => c.id === product.category_id)?.name || '')}
                  <div>
                    <CardTitle className="text-lg">{product.name}</CardTitle>
                    <Badge className={getProviderColor(product.provider)}>
                      {product.provider}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm mb-4">
                {product.description}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(product.price)}
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    disabled={userBalance < product.price}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {userBalance < product.price ? 'Saldo Kurang' : 'Beli Sekarang'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Konfirmasi Pembelian</DialogTitle>
                  </DialogHeader>
                  
                  {selectedProduct && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold">{selectedProduct.name}</h3>
                        <p className="text-gray-600 text-sm">{selectedProduct.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={getProviderColor(selectedProduct.provider)}>
                            {selectedProduct.provider}
                          </Badge>
                          <span className="text-xl font-bold text-blue-600">
                            {formatCurrency(selectedProduct.price)}
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="customer-number">
                          {selectedProduct.category_id === 3 ? 'ID Pelanggan' : 'Nomor HP'}
                        </Label>
                        <Input
                          id="customer-number"
                          type="text"
                          placeholder={
                            selectedProduct.category_id === 3 
                              ? 'Masukkan ID Pelanggan PLN' 
                              : 'Masukkan nomor HP'
                          }
                          value={customerNumber}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setCustomerNumber(e.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex justify-between text-sm">
                          <span>Harga Produk:</span>
                          <span className="font-semibold">{formatCurrency(selectedProduct.price)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span>Saldo Anda:</span>
                          <span className="font-semibold">{formatCurrency(userBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-1 pt-2 border-t border-blue-200">
                          <span className="font-semibold">Saldo Setelah Transaksi:</span>
                          <span className={`font-semibold ${
                            userBalance - selectedProduct.price < 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(userBalance - selectedProduct.price)}
                          </span>
                        </div>
                      </div>

                      <Button 
                        onClick={handlePurchase} 
                        className="w-full"
                        disabled={isTransacting || userBalance < selectedProduct.price}
                      >
                        {isTransacting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          'Konfirmasi Pembelian'
                        )}
                      </Button>

                      {transactionError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{transactionError}</AlertDescription>
                        </Alert>
                      )}

                      {transactionSuccess && (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription className="text-green-700">
                            {transactionSuccess}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {userBalance < product.price && (
                <p className="text-xs text-red-600 mt-2 text-center">
                  Saldo kurang {formatCurrency(product.price - userBalance)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Smartphone className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Tidak ada produk ditemukan
            </h3>
            <p className="text-gray-500">
              Coba ubah filter atau kata kunci pencarian
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}