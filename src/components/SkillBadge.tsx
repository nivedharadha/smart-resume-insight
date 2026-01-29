import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  skill: string;
  variant?: "matched" | "missing" | "neutral";
  className?: string;
}

const SkillBadge = ({ skill, variant = "neutral", className }: SkillBadgeProps) => {
  const variantStyles = {
    matched: "bg-success/10 text-success border-success/20",
    missing: "bg-destructive/10 text-destructive border-destructive/20",
    neutral: "bg-secondary text-secondary-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 hover:scale-105",
        variantStyles[variant],
        className
      )}
    >
      {variant === "matched" && (
        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {variant === "missing" && (
        <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )}
      {skill}
    </span>
  );
};

export default SkillBadge;