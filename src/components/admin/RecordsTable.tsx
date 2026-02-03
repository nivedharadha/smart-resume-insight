import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, Trash2, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AnalysisRecord {
  id: string;
  created_at: string;
  resume_file_name: string;
  resume_file_url: string;
  job_description: string;
  match_percentage: number;
  extracted_skills: string[] | null;
  missing_skills: string[] | null;
}

interface RecordsTableProps {
  records: AnalysisRecord[];
  onRecordDeleted: (id: string) => void;
}

const RecordsTable = ({ records, onRecordDeleted }: RecordsTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const filteredRecords = searchTerm
    ? records.filter(
        (record) =>
          record.resume_file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.job_description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : records;

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("analysis_records")
        .delete()
        .eq("id", id);

      if (error) throw error;

      onRecordDeleted(id);
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

  const viewResults = (id: string) => {
    navigate(`/results/${id}`);
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle>Analysis Records</CardTitle>
        <CardDescription>View and manage all resume analysis records</CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by filename or job description..."
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
                <TableHead>Match %</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
  );
};

export default RecordsTable;
