import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreGauge from "./ScoreGauge";
import SkillBadge from "./SkillBadge";
import ImprovementTip from "./ImprovementTip";
import { CheckCircle2, XCircle, Lightbulb, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisResultsProps {
  matchPercentage: number;
  extractedSkills: string[];
  missingSkills: string[];
  improvementTips: string[];
  className?: string;
}

const AnalysisResults = ({
  matchPercentage,
  extractedSkills,
  missingSkills,
  improvementTips,
  className,
}: AnalysisResultsProps) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Score Card */}
      <Card className="shadow-card border-0 overflow-hidden">
        <div className="gradient-hero">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <TrendingUp className="w-5 h-5 text-primary" />
              Match Score
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <ScoreGauge score={matchPercentage} size="lg" />
            <p className="mt-4 text-sm text-muted-foreground text-center max-w-sm">
              Your resume matches {matchPercentage}% of the job requirements. 
              {matchPercentage >= 70 
                ? " Great job! You're a strong candidate."
                : " See below for improvement suggestions."}
            </p>
          </CardContent>
        </div>
      </Card>

      {/* Skills Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Matched Skills */}
        <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Matched Skills
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {extractedSkills.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extractedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {extractedSkills.map((skill, index) => (
                  <SkillBadge key={index} skill={skill} variant="matched" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No matching skills found.</p>
            )}
          </CardContent>
        </Card>

        {/* Missing Skills */}
        <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-display">
              <XCircle className="w-5 h-5 text-destructive" />
              Skills to Add
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {missingSkills.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((skill, index) => (
                  <SkillBadge key={index} skill={skill} variant="missing" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Great! Your resume covers all the required skills.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Improvement Tips */}
      <Card className="shadow-card border-0 animate-slide-up" style={{ animationDelay: "300ms" }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Lightbulb className="w-5 h-5 text-accent" />
            Improvement Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          {improvementTips.length > 0 ? (
            <div className="space-y-3">
              {improvementTips.map((tip, index) => (
                <ImprovementTip key={index} tip={tip} index={index} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your resume looks great! No specific improvements needed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisResults;