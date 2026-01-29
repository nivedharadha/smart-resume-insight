import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

interface ImprovementTipProps {
  tip: string;
  index?: number;
  className?: string;
}

const ImprovementTip = ({ tip, index = 0, className }: ImprovementTipProps) => {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20 transition-all duration-300 hover:bg-accent/10",
        className
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="p-2 rounded-lg bg-accent/20 shrink-0">
        <Lightbulb className="w-4 h-4 text-accent-foreground" />
      </div>
      <p className="text-sm text-foreground leading-relaxed">{tip}</p>
    </div>
  );
};

export default ImprovementTip;