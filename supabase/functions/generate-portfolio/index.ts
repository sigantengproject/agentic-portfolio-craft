import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portfolioId, content, aiPrompt } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Generating portfolio for ID:', portfolioId);

    // Get template
    const { data: portfolio, error: portfolioError } = await supabase
      .from('portfolios')
      .select(`
        *,
        templates (*)
      `)
      .eq('id', portfolioId)
      .single();

    if (portfolioError) {
      throw new Error(`Failed to fetch portfolio: ${portfolioError.message}`);
    }

    // Prepare AI prompt for content enhancement
    const systemPrompt = `You are an expert portfolio writer. Your task is to enhance and improve the provided portfolio content while maintaining professionalism and authenticity.

Based on the user's information, create enhanced, compelling content that:
1. Improves the professional bio to be more engaging and impactful
2. Expands on skills with relevant context and proficiency levels
3. Adds suggested project descriptions or achievements
4. Maintains the original tone and facts provided by the user
5. Responds in JSON format with enhanced content

User provided content:
- Name: ${content.fullName}
- Profession: ${content.profession}
- Bio: ${content.bio}
- Skills: ${content.skills.join(', ')}

${aiPrompt ? `Additional instructions: ${aiPrompt}` : ''}

Respond with a JSON object containing:
{
  "enhancedBio": "improved professional bio",
  "skillsWithDescriptions": [
    {"skill": "skill name", "description": "brief description of proficiency"}
  ],
  "suggestedProjects": [
    {"title": "project title", "description": "project description"}
  ],
  "professionalSummary": "2-3 sentence summary for header"
}`;

    // Check if OpenAI API key is available
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    let enhancedContent = null;

    if (openAIKey) {
      try {
        console.log('Calling OpenAI API for content enhancement...');
        
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Please enhance my portfolio content based on the information provided.' }
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (openAIResponse.ok) {
          const aiResult = await openAIResponse.json();
          enhancedContent = JSON.parse(aiResult.choices[0].message.content);
          console.log('AI enhancement completed successfully');
        } else {
          console.error('OpenAI API error:', await openAIResponse.text());
        }
      } catch (aiError) {
        console.error('AI enhancement failed:', aiError);
        // Continue without AI enhancement
      }
    }

    // Generate final portfolio content
    const finalContent = {
      ...content,
      ...(enhancedContent && {
        enhancedBio: enhancedContent.enhancedBio,
        skillsWithDescriptions: enhancedContent.skillsWithDescriptions,
        suggestedProjects: enhancedContent.suggestedProjects,
        professionalSummary: enhancedContent.professionalSummary,
      }),
      generatedAt: new Date().toISOString(),
    };

    // Update portfolio with generated content
    const { error: updateError } = await supabase
      .from('portfolios')
      .update({
        generated_content: finalContent,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', portfolioId);

    if (updateError) {
      throw new Error(`Failed to update portfolio: ${updateError.message}`);
    }

    console.log('Portfolio generation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        portfolioId,
        enhancedContent: !!enhancedContent 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-portfolio function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});