import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users } from "lucide-react";

interface AnalysisRecord {
  id: string;
  match_percentage: number;
  user_email: string | null;
}

interface StatsCardsProps {
  records: AnalysisRecord[];
}

const StatsCards = ({ records }: StatsCardsProps) => {
  const uniqueUsers = new Set(records.map((r) => r.user_email).filter(Boolean)).size;
  const avgScore = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + r.match_percentage, 0) / records.length)
    : 0;

  return (
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
            {uniqueUsers}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardDescription>Avg Match Score</CardDescription>
          <CardTitle className="text-3xl font-display">
            {avgScore}%
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
};

export default StatsCards;
