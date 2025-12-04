import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Award, Download, Loader2, Sparkles } from 'lucide-react';
import { MILESTONES } from '@/utils/milestoneChecker';
import { format } from 'date-fns';

interface Certificate {
  id: string;
  milestone_type: string;
  milestone_name: string;
  image_url: string | null;
  earned_at: string;
}

const Certificates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [userName, setUserName] = useState('Student');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCertificates();
    fetchUserName();
  }, [user]);

  const fetchUserName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single();
    if (data) setUserName(data.name);
  };

  const fetchCertificates = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setCertificates(data || []);
    setLoading(false);
  };

  const generateCertificateImage = async (certificate: Certificate) => {
    if (!user) return;
    
    setGenerating(certificate.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: {
          userName,
          milestoneName: certificate.milestone_name,
          milestoneType: certificate.milestone_type,
        },
      });

      if (error) throw error;
      
      if (data.imageUrl) {
        // Update certificate with generated image
        const { error: updateError } = await supabase
          .from('certificates')
          .update({ image_url: data.imageUrl })
          .eq('id', certificate.id);

        if (updateError) throw updateError;

        setCertificates(prev => 
          prev.map(c => c.id === certificate.id ? { ...c, image_url: data.imageUrl } : c)
        );

        toast({ title: "Certificate generated!", description: "Your certificate is ready to download." });
      }
    } catch (error: any) {
      console.error('Certificate generation error:', error);
      toast({ 
        title: "Generation failed", 
        description: error.message || "Could not generate certificate", 
        variant: "destructive" 
      });
    } finally {
      setGenerating(null);
    }
  };

  const downloadCertificate = (imageUrl: string, milestoneName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `certificate-${milestoneName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMilestoneDescription = (type: string) => {
    return MILESTONES.find(m => m.type === type)?.description || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-orbitron">Certificates</h1>
            <p className="text-muted-foreground">{certificates.length} milestone{certificates.length !== 1 ? 's' : ''} achieved</p>
          </div>
        </div>

        {/* Certificates Grid */}
        {certificates.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="text-center py-12">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete milestones to earn certificates!
              </p>
              <Button onClick={() => navigate('/dashboard')}>
                Start Learning
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {certificates.map((cert) => (
              <Card key={cert.id} className="border-primary/20 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        {cert.milestone_name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getMilestoneDescription(cert.milestone_type)}
                      </CardDescription>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Earned on {format(new Date(cert.earned_at), 'MMMM d, yyyy')}
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  {cert.image_url ? (
                    <div className="space-y-3">
                      <img 
                        src={cert.image_url} 
                        alt={`${cert.milestone_name} Certificate`}
                        className="w-full rounded-lg border border-border/50"
                      />
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => downloadCertificate(cert.image_url!, cert.milestone_name)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Certificate
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => generateCertificateImage(cert)}
                      disabled={generating === cert.id}
                    >
                      {generating === cert.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Certificate
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Available Milestones */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Available Milestones</CardTitle>
            <CardDescription>Complete these to earn more certificates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {MILESTONES.filter(m => !certificates.some(c => c.milestone_type === m.type)).map((milestone) => (
                <div 
                  key={milestone.type}
                  className="p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="font-medium text-sm">{milestone.name}</div>
                  <div className="text-xs text-muted-foreground">{milestone.description}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Certificates;
