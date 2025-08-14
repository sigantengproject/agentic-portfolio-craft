-- Create enum for portfolio status
CREATE TYPE portfolio_status AS ENUM ('draft', 'generating', 'completed', 'error');

-- Create enum for template types
CREATE TYPE template_type AS ENUM ('modern', 'classic', 'creative', 'minimal', 'professional');

-- Create enum for export formats
CREATE TYPE export_format AS ENUM ('pdf', 'docx', 'pptx', 'html');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  bio TEXT,
  skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create templates table
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type template_type NOT NULL,
  html_content TEXT NOT NULL,
  css_styles TEXT,
  preview_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template_id UUID REFERENCES public.templates(id),
  content JSONB NOT NULL DEFAULT '{}',
  generated_content JSONB,
  status portfolio_status DEFAULT 'draft',
  export_urls JSONB DEFAULT '{}',
  ai_prompt TEXT,
  revision_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio_revisions table
CREATE TABLE public.portfolio_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  generated_content JSONB,
  changes_made TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio_exports table
CREATE TABLE public.portfolio_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  format export_format NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_exports ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view and edit their own profile" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = user_id);

-- Create policies for templates (public read, admin write)
CREATE POLICY "Templates are viewable by everyone" 
ON public.templates 
FOR SELECT 
USING (is_active = true);

-- Create policies for portfolios
CREATE POLICY "Users can manage their own portfolios" 
ON public.portfolios 
FOR ALL 
USING (auth.uid() = user_id);

-- Create policies for portfolio revisions
CREATE POLICY "Users can view their portfolio revisions" 
ON public.portfolio_revisions 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.portfolios WHERE id = portfolio_id));

-- Create policies for portfolio exports
CREATE POLICY "Users can view their portfolio exports" 
ON public.portfolio_exports 
FOR SELECT 
USING (auth.uid() = (SELECT user_id FROM public.portfolios WHERE id = portfolio_id));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default templates
INSERT INTO public.templates (name, description, type, html_content, css_styles) VALUES
(
  'Modern Portfolio',
  'Clean and modern design with bold typography',
  'modern',
  '<!DOCTYPE html><html><head><title>{{name}} - Portfolio</title></head><body><div class="container"><header><h1>{{name}}</h1><p>{{title}}</p></header><section class="about"><h2>About Me</h2><p>{{bio}}</p></section><section class="skills"><h2>Skills</h2><ul>{{#each skills}}<li>{{this}}</li>{{/each}}</ul></section></div></body></html>',
  '.container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }'
),
(
  'Classic Portfolio',
  'Traditional and professional layout',
  'classic',
  '<!DOCTYPE html><html><head><title>{{name}} - Professional Portfolio</title></head><body><div class="wrapper"><div class="header"><h1>{{name}}</h1><h2>{{title}}</h2></div><div class="content"><div class="section"><h3>Professional Summary</h3><p>{{bio}}</p></div><div class="section"><h3>Core Competencies</h3><ul>{{#each skills}}<li>{{this}}</li>{{/each}}</ul></div></div></div></body></html>',
  '.wrapper { max-width: 900px; margin: 0 auto; padding: 30px; font-family: Times, serif; }'
),
(
  'Creative Portfolio', 
  'Artistic and expressive design for creative professionals',
  'creative',
  '<!DOCTYPE html><html><head><title>{{name}} - Creative Portfolio</title></head><body><div class="creative-container"><div class="hero"><h1 class="creative-title">{{name}}</h1><p class="creative-subtitle">{{title}}</p></div><div class="creative-about"><h2>My Story</h2><p>{{bio}}</p></div><div class="creative-skills"><h2>What I Do</h2><div class="skill-grid">{{#each skills}}<div class="skill-item">{{this}}</div>{{/each}}</div></div></div></body></html>',
  '.creative-container { font-family: "Arial", sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; }'
);