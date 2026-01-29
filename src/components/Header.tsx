import { FileSearch } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="p-2 rounded-xl gradient-primary">
            <FileSearch className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl">ResumeAI</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Analyze
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;