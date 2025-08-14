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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">AI Portfolio Builder</h1>
            <p className="text-muted-foreground">Welcome back, {user?.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-semibold">Your Portfolios</h2>
            <p className="text-muted-foreground">Manage and create AI-powered portfolios</p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Portfolio
          </Button>
        </div>

        {/* Portfolios Grid */}
        {portfolios.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No portfolios yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI-powered portfolio to get started
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Portfolio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio) => (
              <Card key={portfolio.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{portfolio.title}</CardTitle>
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(portfolio.status)} text-white`}
                    >
                      {portfolio.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Revision {portfolio.revision_number}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Updated {new Date(portfolio.updated_at).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {portfolio.status === 'completed' && (
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deletePortfolio(portfolio.id)}
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