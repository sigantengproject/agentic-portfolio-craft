import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Download, Edit, Trash2, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreatePortfolioForm } from '@/components/CreatePortfolioForm';

interface Portfolio {
  id: string;
  title: string;
  status: 'draft' | 'generating' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  template_id: string;
  revision_number: number;
}

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPortfolios(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching portfolios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deletePortfolio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPortfolios(portfolios.filter(p => p.id !== id));
      toast({
        title: "Portfolio deleted",
        description: "Your portfolio has been successfully deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting portfolio",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'generating': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,hsl(262_83%_58%/0.1),transparent_50%)] opacity-50"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(142_76%_36%/0.1),transparent_50%)] opacity-50"></div>
      
      {/* Header */}
      <header className="border-b border-border/50 glass backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
              <div className="text-lg font-bold text-primary-foreground">✨</div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">AI Portfolio Builder</h1>
              <p className="text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
          </div>
          <Button variant="outline" onClick={signOut} className="border-border/50 hover:bg-secondary/50 transition-all duration-300">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Your Portfolios</h2>
            <p className="text-muted-foreground">Manage and create AI-powered portfolios</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)} className="bg-gradient-primary shadow-primary hover:shadow-accent transition-all duration-300 border-0">
            <Plus className="w-4 h-4 mr-2" />
            Create New Portfolio
          </Button>
        </div>

        {/* Portfolios Grid */}
        {portfolios.length === 0 ? (
          <Card className="text-center py-12 glass shadow-card border-0 backdrop-blur-xl animate-slide-up">
            <CardContent>
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-secondary rounded-2xl flex items-center justify-center shadow-accent">
                <FileText className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">No portfolios yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first AI-powered portfolio to get started on your professional journey
              </p>
              <Button onClick={() => setShowCreateForm(true)} className="bg-gradient-primary shadow-primary hover:shadow-accent transition-all duration-300 border-0">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Portfolio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {portfolios.map((portfolio, index) => (
              <Card key={portfolio.id} className="glass shadow-card border-0 backdrop-blur-xl hover:shadow-primary transition-all duration-300 group" style={{animationDelay: `${index * 100}ms`}}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">{portfolio.title}</CardTitle>
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(portfolio.status)} text-white border-0 shadow-sm`}
                    >
                      {portfolio.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    Revision {portfolio.revision_number}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Updated {new Date(portfolio.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-border/50 hover:bg-secondary/50 hover:shadow-sm transition-all">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {portfolio.status === 'completed' && (
                        <Button size="sm" variant="outline" className="border-border/50 hover:bg-accent/10 hover:text-accent hover:shadow-sm transition-all">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deletePortfolio(portfolio.id)}
                        className="border-border/50 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Portfolio Modal */}
      {showCreateForm && (
        <CreatePortfolioForm 
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchPortfolios();
          }}
        />
      )}
    </div>
  );
};