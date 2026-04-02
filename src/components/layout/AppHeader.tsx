import { ChevronLeft, Search, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  rightIcon?: React.ReactNode;
}

const AppHeader = ({ title, showBack = false, rightIcon }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <div className="w-10">
        {showBack && (
          <button onClick={() => navigate(-1)} className="p-1 -ml-1">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
        )}
      </div>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/search")}>
          <Search className="w-5 h-5 text-foreground" />
        </button>
        {rightIcon || (
          <button onClick={() => navigate("/help")}>
            <Bell className="w-5 h-5 text-foreground" />
          </button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
