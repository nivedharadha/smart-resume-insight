import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import FileUpload from "@/components/FileUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, FileSearch, Target, Zap } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!resumeFile || !jobDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please upload a resume and enter a job description.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      // Upload resume to storage
      const fileName = `${Date.now()}-${resumeFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, resumeFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload resume");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(fileName);

      // Call AI analysis function with file URL
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-resume",
        {
          body: { 
            resumeUrl: urlData.publicUrl,
            jobDescription 
          },
        }
      );

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        throw new Error(analysisError.message || "Failed to analyze resume");
      }

      if (analysisData.error) {
        throw new Error(analysisData.error);
      }

      // Save to database
      const { data: record, error: dbError } = await supabase
        .from("analysis_records")
        .insert({
          resume_file_name: resumeFile.name,
          resume_file_url: urlData.publicUrl,
          job_description: jobDescription,
          match_percentage: analysisData.matchPercentage,
          extracted_skills: analysisData.extractedSkills,
          missing_skills: analysisData.missingSkills,
          improvement_tips: analysisData.improvementTips,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error("Failed to save analysis");
      }

      // Navigate to results
      navigate(`/results/${record.id}`);
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const features = [
    {
      icon: FileSearch,
      title: "ATS Optimized",
      description: "See how well your resume passes Applicant Tracking Systems",
    },
    {
      icon: Target,
      title: "Skill Gap Analysis",
      description: "Identify missing skills and keywords from job descriptions",
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Get actionable feedback in seconds, not hours",
    },
  ];

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      
      <main className="container px-4 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-up">
            <Sparkles className="w-4 h-4" />
            AI-Powered Resume Analysis
          </div>
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fade-up" style={{ animationDelay: "100ms" }}>
            Land Your Dream Job with{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-success">
              AI Resume Analysis
            </span>
          </h1>
          <p className="text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "200ms" }}>
            Compare your resume against any job description and get instant feedback
            on how to improve your chances of getting hired.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="shadow-card border-0 bg-card/80 backdrop-blur-sm animate-fade-up" style={{ animationDelay: `${300 + index * 100}ms` }}>
              <CardContent className="pt-6">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Form */}
        <Card className="max-w-4xl mx-auto shadow-xl border-0 overflow-hidden animate-fade-up" style={{ animationDelay: "600ms" }}>
          <CardContent className="p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Resume Upload */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  Upload Your Resume
                </label>
                <FileUpload
                  onFileSelect={setResumeFile}
                  acceptedTypes={["application/pdf"]}
                  maxSizeMB={10}
                />
              </div>

              {/* Job Description */}
              <div className="flex flex-col">
                <label className="block text-sm font-medium mb-3">
                  Paste Job Description
                </label>
                <Textarea
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="flex-1 min-h-[200px] resize-none border-2 border-muted focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Analyze Button */}
            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={!resumeFile || !jobDescription.trim() || isAnalyzing}
                className="gradient-primary text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze Resume
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Index;