import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
}

interface CreatePortfolioFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreatePortfolioForm = ({ onClose, onSuccess }: CreatePortfolioFormProps) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    templateId: '',
    fullName: '',
    profession: '',
    bio: '',
    skills: '',
    aiPrompt: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching templates",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGenerating(true);

    try {
      // Create portfolio record
      const portfolioData = {
        title: formData.title,
        template_id: formData.templateId,
        user_id: user!.id,
        content: {
          fullName: formData.fullName,
          profession: formData.profession,
          bio: formData.bio,
          skills: formData.skills.split(',').map(s => s.trim()),
        },
        ai_prompt: formData.aiPrompt,
        status: 'generating' as const,
      };

      const { data: portfolio, error: portfolioError } = await supabase
        .from('portfolios')
        .insert([portfolioData])
        .select()
        .single();

      if (portfolioError) throw portfolioError;

      // Trigger AI generation
      const { data: generationResult, error: generationError } = await supabase.functions.invoke('generate-portfolio', {
        body: { 
          portfolioId: portfolio.id,
          content: portfolioData.content,
          aiPrompt: formData.aiPrompt 
        }
      });

      if (generationError) {
        // Update portfolio status to error
        await supabase
          .from('portfolios')
          .update({ status: 'error' })
          .eq('id', portfolio.id);
        
        throw generationError;
      }

      toast({
        title: "Portfolio created successfully!",
        description: "Your AI-powered portfolio is being generated.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error creating portfolio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass shadow-card border-0 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">Create New Portfolio</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Portfolio Title</Label>
              <Input
                id="title"
                placeholder="My Professional Portfolio"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={formData.templateId}
                onValueChange={(value) => setFormData({...formData, templateId: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profession">Profession/Title</Label>
              <Input
                id="profession"
                placeholder="Software Developer"
                value={formData.profession}
                onChange={(e) => setFormData({...formData, profession: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about your professional background, experience, and what makes you unique..."
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (comma-separated)</Label>
            <Input
              id="skills"
              placeholder="JavaScript, React, Node.js, Python, SQL"
              value={formData.skills}
              onChange={(e) => setFormData({...formData, skills: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aiPrompt">AI Enhancement Prompt (Optional)</Label>
            <Textarea
              id="aiPrompt"
              placeholder="Additional instructions for AI to enhance your portfolio content..."
              value={formData.aiPrompt}
              onChange={(e) => setFormData({...formData, aiPrompt: e.target.value})}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-6 border-t border-border/50">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="border-border/50 hover:bg-secondary/50">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-primary shadow-primary hover:shadow-accent transition-all duration-300 border-0">
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {generating ? 'Generating Portfolio...' : 'Creating...'}
                </div>
              ) : (
                'Create Portfolio'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};