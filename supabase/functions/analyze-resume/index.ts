import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, jobDescription } = await req.json();

    if (!resumeUrl || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Resume URL and job description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the PDF content as base64 for the AI to analyze
    const pdfResponse = await fetch(resumeUrl);
    if (!pdfResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch resume PDF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const pdfBytes = await pdfResponse.arrayBuffer();
    const uint8Array = new Uint8Array(pdfBytes);
    
    // Convert to base64 in chunks to avoid stack overflow
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Pdf = btoa(binary);

    const systemPrompt = `You are an expert ATS (Applicant Tracking System) resume analyzer. Your task is to analyze a resume PDF and compare it against a job description to provide detailed analysis.

Analyze the resume content and job description, then respond with a JSON object containing:
1. matchPercentage: A number from 0-100 representing how well the resume matches the job requirements
2. extractedSkills: An array of skills found in the RESUME that are also relevant to the job (max 15)
3. missingSkills: An array of important skills from the JOB DESCRIPTION that are NOT in the resume (max 10)
4. improvementTips: An array of 3-5 specific, actionable suggestions to improve the resume for this job

Consider:
- Technical skills and technologies
- Soft skills and competencies  
- Experience requirements
- Keywords and industry terms
- Quantifiable achievements

Respond ONLY with valid JSON, no additional text or markdown formatting.`;

    const userPrompt = `Please analyze this resume against the following job description.

JOB DESCRIPTION:
${jobDescription}

The resume PDF content is provided. Extract all relevant information including skills, experience, education, and achievements to perform a comprehensive ATS analysis.`;

    // Use Gemini which has document/vision capabilities
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: userPrompt },
              { 
                type: "image_url", 
                image_url: { 
                  url: `data:application/pdf;base64,${base64Pdf}` 
                } 
              }
            ]
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze resume" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Invalid AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response - handle markdown code blocks
    let analysisResult;
    try {
      let jsonString = content.trim();
      // Remove markdown code blocks if present
      if (jsonString.startsWith("```json")) {
        jsonString = jsonString.slice(7);
      } else if (jsonString.startsWith("```")) {
        jsonString = jsonString.slice(3);
      }
      if (jsonString.endsWith("```")) {
        jsonString = jsonString.slice(0, -3);
      }
      analysisResult = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse analysis results" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and normalize the response
    const result = {
      matchPercentage: Math.min(100, Math.max(0, Number(analysisResult.matchPercentage) || 0)),
      extractedSkills: Array.isArray(analysisResult.extractedSkills) ? analysisResult.extractedSkills : [],
      missingSkills: Array.isArray(analysisResult.missingSkills) ? analysisResult.missingSkills : [],
      improvementTips: Array.isArray(analysisResult.improvementTips) ? analysisResult.improvementTips : [],
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in analyze-resume function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});