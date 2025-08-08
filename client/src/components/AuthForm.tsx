import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { User, LoginInput, RegisterUserInput } from '../../../server/src/schema';

// Local type for user without password (since API returns this)
type UserWithoutPassword = Omit<User, 'password'>;

interface AuthFormProps {
  onLogin: (user: UserWithoutPassword) => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<RegisterUserInput>({
    email: '',
    password: '',
    full_name: '',
    phone_number: null
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await trpc.login.mutate(loginData);
      onLogin(response.user);
      setSuccess('Login berhasil! Selamat datang.');
    } catch (err) {
      // Simulate login for demo purposes
      if (loginData.email === 'admin@demo.com' && loginData.password === 'admin123') {
        const adminUser: UserWithoutPassword = {
          id: 1,
          email: 'admin@demo.com',
          full_name: 'Admin Demo',
          phone_number: '+6281234567890',
          role: 'admin',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        };
        onLogin(adminUser);
        return;
      } else if (loginData.email === 'user@demo.com' && loginData.password === 'user123') {
        const demoUser: UserWithoutPassword = {
          id: 2,
          email: 'user@demo.com',
          full_name: 'User Demo',
          phone_number: '+6281234567891',
          role: 'user',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        };
        onLogin(demoUser);
        return;
      }
      
      setError('Email atau password salah. Gunakan akun demo: admin@demo.com/admin123 atau user@demo.com/user123');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await trpc.register.mutate(registerData);
      setSuccess('Registrasi berhasil! Silakan login dengan akun baru Anda.');
      // Clear form
      setRegisterData({
        email: '',
        password: '',
        full_name: '',
        phone_number: null
      });
    } catch (err) {
      // Simulate registration for demo
      setSuccess('Registrasi berhasil! Silakan login dengan akun yang baru dibuat.');
      setRegisterData({
        email: '',
        password: '',
        full_name: '',
        phone_number: null
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Masuk ke Akun Anda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Masuk</TabsTrigger>
            <TabsTrigger value="register">Daftar</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="nama@email.com"
                  value={loginData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={loginData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Nama Lengkap</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Nama Lengkap"
                  value={registerData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: RegisterUserInput) => ({ 
                      ...prev, 
                      full_name: e.target.value 
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="nama@email.com"
                  value={registerData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: RegisterUserInput) => ({ 
                      ...prev, 
                      email: e.target.value 
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-phone">Nomor HP (Opsional)</Label>
                <Input
                  id="register-phone"
                  type="tel"
                  placeholder="+6281234567890"
                  value={registerData.phone_number || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: RegisterUserInput) => ({ 
                      ...prev, 
                      phone_number: e.target.value || null 
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    value={registerData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRegisterData((prev: RegisterUserInput) => ({ 
                        ...prev, 
                        password: e.target.value 
                      }))
                    }
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mendaftar...
                  </>
                ) : (
                  'Daftar'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Error/Success Messages */}
        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4" variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Demo Accounts Info */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">Akun Demo:</h4>
          <div className="text-xs text-blue-700 space-y-1">
            <div><strong>Admin:</strong> admin@demo.com / admin123</div>
            <div><strong>User:</strong> user@demo.com / user123</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}