import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import AnalysisResults from "@/components/AnalysisResults";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, FileText, Download, ShieldAlert } from "lucide-react";

interface AnalysisRecord {
  id: string;
  created_at: string;
  resume_file_name: string;
  resume_file_url: string;
  job_description: string;
  match_percentage: number;
  extracted_skills: string[];
  missing_skills: string[];
  improvement_tips: string[];
  access_token?: string;
}

const Results = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { toast } = useToast();
  const [record, setRecord] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      if (!id) return;

      try {
        // Set the access token as a session setting for RLS policy
        if (token) {
          await supabase.rpc("set_config", { 
            setting_name: "app.access_token", 
            setting_value: token 
          });
        }

        const { data, error } = await supabase
          .from("analysis_records")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching record:", error);
          // Check if it's a permission error
          if (error.code === "PGRST116" || error.message?.includes("permission")) {
            setAccessDenied(true);
          } else {
            toast({
              title: "Error",
              description: "Failed to load analysis results",
              variant: "destructive",
            });
          }
          return;
        }

        if (!data) {
          // No data could mean access denied or not found
          if (!token) {
            setAccessDenied(true);
          } else {
            toast({
              title: "Not found",
              description: "Analysis record not found or link has expired",
              variant: "destructive",
            });
          }
          return;
        }

        setRecord(data);
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRecord();
  }, [id, token, toast]);

  if (loading) {
    return (
      <div className="min-h-screen gradient-hero">
        <Header />
        <div className="container flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analysis results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen gradient-hero">
        <Header />
        <div className="container flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to view this analysis. <br />
              The link may have expired or is invalid.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Analyze New Resume
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen gradient-hero">
        <Header />
        <div className="container flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">Analysis Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The analysis you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Analyze New Resume
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero">
      <Header />
      
      <main className="container px-4 py-8 md:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Analyzer
            </Link>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Analysis Results
            </h1>
            <p className="text-muted-foreground mt-1">
              for <span className="font-medium text-foreground">{record.resume_file_name}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
            <a
              href={record.resume_file_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                View Resume
              </Button>
            </a>
            <Link to="/">
              <Button size="sm" className="gradient-primary text-primary-foreground">
                Analyze Another
              </Button>
            </Link>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-4xl mx-auto">
          <AnalysisResults
            matchPercentage={record.match_percentage}
            extractedSkills={record.extracted_skills || []}
            missingSkills={record.missing_skills || []}
            improvementTips={record.improvement_tips || []}
          />
        </div>

        {/* Job Description Reference */}
        <div className="max-w-4xl mx-auto mt-8">
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <span className="group-open:rotate-90 transition-transform">▶</span>
                View Original Job Description
              </div>
            </summary>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{record.job_description}</p>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
};

export default Results;
