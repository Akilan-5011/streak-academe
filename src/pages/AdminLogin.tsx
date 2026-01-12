import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff, ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  adminCode: z.string().min(1, 'Admin code is required')
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ name: '', email: '', password: '', adminCode: '' });

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = signUpSchema.parse(signUpData);

      // Call the edge function to register admin
      const { data, error } = await supabase.functions.invoke('register-admin', {
        body: {
          email: validated.email,
          password: validated.password,
          name: validated.name,
          adminCode: validated.adminCode
        }
      });

      if (error) {
        toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data?.error) {
        toast({ title: "Registration Failed", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      toast({ title: "Admin Registered!", description: "You can now sign in with your credentials" });
      setActiveTab('signin');
      setSignInData({ email: validated.email, password: '' });
      setSignUpData({ name: '', email: '', password: '', adminCode: '' });

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
              Administrator Portal
            </CardTitle>
            <CardDescription>
              Sign in or register as an administrator
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email" className="text-muted-foreground">Admin Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className="bg-card/50 border-border/50 focus:border-destructive"
                      required
                    />
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
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-name" className="text-muted-foreground">Full Name</Label>
                    <Input
                      id="admin-name"
                      type="text"
                      placeholder="John Doe"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      className="bg-card/50 border-border/50 focus:border-destructive"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-email" className="text-muted-foreground">Email</Label>
                    <Input
                      id="admin-signup-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="bg-card/50 border-border/50 focus:border-destructive"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-signup-password" className="text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
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
                  <div className="space-y-2">
                    <Label htmlFor="admin-code" className="text-muted-foreground">Admin Secret Code</Label>
                    <Input
                      id="admin-code"
                      type="password"
                      placeholder="Enter admin secret code"
                      value={signUpData.adminCode}
                      onChange={(e) => setSignUpData({ ...signUpData, adminCode: e.target.value })}
                      className="bg-card/50 border-border/50 focus:border-destructive"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Contact your system administrator for the secret code</p>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-destructive to-orange-600 hover:opacity-90 text-white" 
                    disabled={loading}
                  >
                    {loading ? 'Registering...' : 'Register as Admin'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

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
