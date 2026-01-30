import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Loader2 } from "lucide-react";
import StatsCards from "@/components/admin/StatsCards";
import RecordsTable from "@/components/admin/RecordsTable";
import InviteAdminForm from "@/components/admin/InviteAdminForm";

interface AnalysisRecord {
  id: string;
  created_at: string;
  resume_file_name: string;
  resume_file_url: string;
  job_description: string;
  match_percentage: number;
  user_email: string | null;
  extracted_skills: string[] | null;
  missing_skills: string[] | null;
}

const AdminDashboard = () => {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/admin/login");
        return;
      }

      // Verify admin role
      const { data: isAdmin, error: roleError } = await supabase
        .rpc('has_role', { _user_id: session.user.id, _role: 'admin' });

      if (roleError || !isAdmin) {
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      fetchRecords();
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/admin/login");
    }
  };

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from("analysis_records")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRecords(data || []);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordDeleted = (id: string) => {
    setRecords(records.filter((r) => r.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage analysis records and administrators</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <StatsCards records={records} />
        
        <div className="mb-8">
          <InviteAdminForm />
        </div>

        <RecordsTable records={records} onRecordDeleted={handleRecordDeleted} />
      </main>
    </div>
  );
};

export default AdminDashboard;
