import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });

  // Check if already logged in as admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        setCheckingRole(true);
        const { data } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        if (data) {
          navigate('/admin');
        }
        setCheckingRole(false);
      }
    };
    
    checkAdminStatus();
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signInSchema.parse(signInData);
      const { error } = await signIn(validated.email, validated.password);

      if (error) {
        toast({ title: "Error", description: "Invalid email or password", variant: "destructive" });
        setLoading(false);
        return;
      }

      // After successful login, check if user has admin role
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      
      if (loggedInUser) {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: loggedInUser.id,
          _role: 'admin'
        });

        if (isAdmin) {
          toast({ title: "Welcome Admin!", description: "Access granted to Admin Panel" });
          navigate('/admin');
        } else {
          // Sign out non-admin users
          await supabase.auth.signOut();
          toast({ 
            title: "Access Denied", 
            description: "This login is for administrators only. Please use the student login.",
            variant: "destructive" 
          });
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({ title: "Validation Error", description: err.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-primary animate-pulse">Verifying access...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-dark neural-bg relative overflow-hidden">
      {/* Animated background elements - Red/Orange theme for admin */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Cyber frame - Red accent */}
      <div className="absolute inset-4 border border-destructive/30 rounded-lg pointer-events-none" />
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-destructive" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-destructive" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-destructive" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-destructive" />

      <div className="w-full max-w-md z-10">
        {/* Back to student login */}
        <Link 
          to="/auth" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Student Login</span>
        </Link>

        {/* Shield Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4 relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            <Shield className="w-16 h-16 text-destructive relative z-10 float" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-wider">ADMIN ACCESS</h1>
          <p className="text-destructive text-lg font-semibold">RESTRICTED AREA</p>
          <p className="text-muted-foreground text-sm">Authorized Personnel Only</p>
        </div>

        <Card className="glass border-destructive/30">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold tracking-wide flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Administrator Login
            </CardTitle>
            <CardDescription>
              Enter your admin credentials to access the control panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-muted-foreground">Admin Email</Label>
                <div className="relative">
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    className="bg-card/50 border-border/50 focus:border-destructive pr-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    className="bg-card/50 border-border/50 focus:border-destructive pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-destructive to-orange-600 hover:opacity-90 text-white" 
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Access Admin Panel'}
              </Button>
            </form>

            <div className="mt-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ This area is monitored. Unauthorized access attempts will be logged.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
