import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, User, Mail, Star, Trophy, Flame, Calendar } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfile();
    fetchQuizCount();
    checkAdmin();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setProfile(data);
      setName(data.name);
    }
    setLoading(false);
  };

  const fetchQuizCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    setTotalQuizzes(count || 0);
  };

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    setIsAdmin(!!data);
  };

  const handleUpdateName = async () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Name cannot be empty", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', user!.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success!", description: "Profile updated successfully" });
    setEditing(false);
    fetchProfile();
  };

  const getLevel = (xp: number) => {
    if (xp <= 100) return { name: 'Beginner', color: 'text-info', icon: '🌱' };
    if (xp <= 300) return { name: 'Intermediate', color: 'text-accent', icon: '⚡' };
    return { name: 'Advanced', color: 'text-primary', icon: '🚀' };
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const level = getLevel(profile.xp);

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">Manage your account</p>
          </div>
        </div>

        {/* Profile Info Card */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              {editing ? (
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                  <Button onClick={handleUpdateName}>Save</Button>
                  <Button variant="outline" onClick={() => {
                    setEditing(false);
                    setName(profile.name);
                  }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.name}</span>
                  </div>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{profile.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle>Your Statistics</CardTitle>
            <CardDescription>Track your learning progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Star className="h-5 w-5" />
                  <span className="font-semibold">Total XP</span>
                </div>
                <div className="text-3xl font-bold">{profile.xp}</div>
                <div className={`text-sm font-semibold ${level.color} flex items-center gap-1 mt-1`}>
                  <span>{level.icon}</span>
                  <span>{level.name}</span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <Flame className="h-5 w-5" />
                  <span className="font-semibold">Streak</span>
                </div>
                <div className="text-3xl font-bold">{profile.current_streak}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Best: {profile.longest_streak} days
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <Trophy className="h-5 w-5" />
                  <span className="font-semibold">Quizzes</span>
                </div>
                <div className="text-3xl font-bold">{totalQuizzes}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Total attempts
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-info mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Role</span>
                </div>
                <div className="text-sm font-bold capitalize">
                  {isAdmin ? 'Admin' : 'Student'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Account type
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
