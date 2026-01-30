import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, Eye, LogOut, Loader2, FileText, Users } from "lucide-react";
import { format } from "date-fns";

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
  const [filteredRecords, setFilteredRecords] = useState<AnalysisRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = records.filter(
        (record) =>
          record.resume_file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.job_description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecords(filtered);
    } else {
      setFilteredRecords(records);
    }
  }, [searchTerm, records]);

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
      setFilteredRecords(data || []);
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

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("analysis_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setRecords(records.filter((r) => r.id !== id));
      toast({
        title: "Deleted",
        description: "Record deleted successfully",
      });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete record",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const viewResults = (id: string) => {
    navigate(`/results/${id}`);
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
            <p className="text-muted-foreground mt-1">Manage analysis records</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>Total Analyses</CardDescription>
              <CardTitle className="text-3xl font-display flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                {records.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>Unique Users</CardDescription>
              <CardTitle className="text-3xl font-display flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                {new Set(records.map((r) => r.user_email).filter(Boolean)).size}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardDescription>Avg Match Score</CardDescription>
              <CardTitle className="text-3xl font-display">
                {records.length > 0
                  ? Math.round(
                      records.reduce((sum, r) => sum + r.match_percentage, 0) / records.length
                    )
                  : 0}
                %
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search and Table */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Analysis Records</CardTitle>
            <CardDescription>View and manage all resume analysis records</CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename, email, or job description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Resume</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Match %</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No records match your search" : "No records found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(record.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={record.resume_file_name}>
                          {record.resume_file_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.user_email || "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              record.match_percentage >= 70
                                ? "text-green-600"
                                : record.match_percentage >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {record.match_percentage}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {record.extracted_skills?.length || 0} found
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewResults(record.id)}
                              title="View Results"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  disabled={deletingId === record.id}
                                  title="Delete Record"
                                >
                                  {deletingId === record.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this analysis record. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(record.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
