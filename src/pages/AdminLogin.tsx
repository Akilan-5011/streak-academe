import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Shield, Eye, EyeOff } from 'lucide-react';
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
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ name: '', email: '', password: '', confirmPassword: '' });

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
        toast({ title: "Error", description: "Invalid credentials", variant: "destructive" });
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
          // Sign out non-admin users immediately
          await supabase.auth.signOut();
          toast({ 
            title: "Access Denied", 
            description: "You are not authorized to access this area.",
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
      const { error } = await signUp(validated.email, validated.password, validated.name);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // After signup, update the user role to admin
      const { data: { user: newUser } } = await supabase.auth.getUser();
      
      if (newUser) {
        // Update role from student to admin
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', newUser.id);

        if (roleError) {
          console.error('Error updating role:', roleError);
          toast({ title: "Error", description: "Failed to set admin role", variant: "destructive" });
          setLoading(false);
          return;
        }

        toast({ title: "Admin Account Created!", description: "You now have admin access" });
        navigate('/admin');
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
        {/* Shield Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4 relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            <Shield className="w-16 h-16 text-destructive relative z-10 float" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-wider">ADMIN ACCESS</h1>
          <p className="text-destructive text-lg font-semibold">RESTRICTED AREA</p>
        </div>

        <Card className="glass border-destructive/30">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold tracking-wide flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-destructive" />
              Admin Portal
            </CardTitle>
            <CardDescription>
              Sign in or create an admin account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email" className="text-muted-foreground">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="Enter email"
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
                    {loading ? 'Authenticating...' : 'Sign In'}
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
                      placeholder="Enter your name"
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
                      placeholder="Enter email"
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
                    <Label htmlFor="admin-confirm-password" className="text-muted-foreground">Confirm Password</Label>
                    <Input
                      id="admin-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      className="bg-card/50 border-border/50 focus:border-destructive"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-destructive to-orange-600 hover:opacity-90 text-white" 
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Admin Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                ⚠️ Admin accounts have full system access.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
