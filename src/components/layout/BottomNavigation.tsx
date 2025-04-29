import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activePage: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Home", icon: "dashboard", path: "/dashboard" },
  { id: "leave", label: "Leave", icon: "event_note", path: "/leave" },
  { id: "attendance", label: "Time", icon: "access_time", path: "/attendance" },
  { id: "payslips", label: "Payslips", icon: "description", path: "/payslips" },
  { id: "profile", label: "Profile", icon: "person", path: "/profile" },
];

export default function BottomNavigation({ activePage }: BottomNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full">
      <nav className="glass w-full py-2 px-6 border-t border-soft-gray/20 backdrop-blur-lg bg-white/90 shadow-lg">
        <div className="flex justify-between items-center max-w-screen-lg mx-auto">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                "navbar-item flex flex-col items-center rounded-xl p-2 flex-1",
                item.id === activePage ? "active" : "text-slate hover:text-navy"
              )}
            >
              <span className="material-icons-round">{item.icon}</span>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
