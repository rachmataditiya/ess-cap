import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useStatusBar } from "@/hooks/useStatusBar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Leave from "@/pages/leave";
import Attendance from "@/pages/attendance";
import AttendanceHistory from "@/pages/attendance-history";
import Payslips from "@/pages/payslips";
import PayslipDetail from "@/pages/payslip-detail";
import PayslipsHistory from "@/pages/payslips-history";
import LeaveHistory from "@/pages/leave-history";
import Expenses from "@/pages/expenses";
import ExpensesHistory from "@/pages/expenses-history";
import Announcements from "@/pages/announcements";
import Calendar from "@/pages/calendar";
import Profile from "@/pages/profile";
import AuthPage from "@/pages/auth-page";
import ProjectUpdates from "@/pages/project-updates";
import Resources from "@/pages/resources";
import BottomNavigation from "@/components/layout/BottomNavigation";
import ActionButton from "@/components/layout/ActionButton";
import Header from "@/components/layout/Header";
import { useOdooAuth } from "@/hooks/useOdoo";
import ErrorBoundary from "@/components/ui/error-boundary";
import { LoadingFallback } from "@/components/ui/loading-skeleton";
import ExpenseDetail from "@/pages/expense-detail";

// Komponen untuk melindungi rute yang membutuhkan autentikasi
function ProtectedRoute(props: { component: React.ComponentType; path: string }) {
  const { component: Component, path } = props;
  const { isAuthenticated, isLoading } = useOdooAuth();
  const [, navigate] = useLocation();

  // Cek halaman ini ngerender apa
  console.log(`ProtectedRoute: ${path}, isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <Route path={path}>
        <LoadingFallback />
      </Route>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <ErrorBoundary>
        <Component />
      </ErrorBoundary>
    </Route>
  );
}

function Router() {
  const [location] = useLocation();
  const currentPage = location.slice(1) || "dashboard";
  const { isAuthenticated, isLoading } = useOdooAuth();

  // Get page title based on current route
  const getPageTitle = () => {
    const titles: { [key: string]: string } = {
      dashboard: "Dashboard",
      leave: "Leave",
      attendance: "Attendance",
      "attendance-history": "Attendance History",
      payslips: "Payslips",
      "payslips-history": "Payslip History",
      "leave-history": "Leave History",
      expenses: "Expenses",
      "expenses-history": "Expenses History",
      announcements: "Announcements",
      calendar: "Calendar",
      profile: "Profile",
      "project-updates": "Project Updates",
      resources: "Resources",
    };
    return titles[currentPage] || "HR Portal";
  };

  // Debug perutean
  console.log(`Router: location=${location}, isAuthenticated=${isAuthenticated}, isLoading=${isLoading}`);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <div className="relative max-w-md mx-auto min-h-screen">
      {isAuthenticated && location !== "/auth" && (
        <Header 
          title={getPageTitle()} 
          showBackButton={location !== "/" && location !== "/dashboard"} 
        />
      )}
      
      <main className="pt-[calc(3.5rem+env(safe-area-inset-top))] pb-20 min-h-[calc(100vh-5rem)] safe-padding">
        <Switch>
          <Route path="/auth">
            {isAuthenticated ? <Redirect to="/" /> : <AuthPage />}
          </Route>
          
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/dashboard" component={Dashboard} />
          <ProtectedRoute path="/leave" component={Leave} />
          <ProtectedRoute path="/attendance" component={Attendance} />
          <ProtectedRoute path="/attendance-history" component={AttendanceHistory} />
          <ProtectedRoute path="/payslips" component={Payslips} />
          <ProtectedRoute path="/payslips/:id" component={PayslipDetail} />
          <ProtectedRoute path="/payslips-history" component={PayslipsHistory} />
          <ProtectedRoute path="/leave-history" component={LeaveHistory} />
          <ProtectedRoute path="/expenses" component={Expenses} />
          <ProtectedRoute path="/expenses/:id" component={ExpenseDetail} />
          <ProtectedRoute path="/expenses-history" component={ExpensesHistory} />
          <ProtectedRoute path="/announcements" component={Announcements} />
          <ProtectedRoute path="/calendar" component={Calendar} />
          <ProtectedRoute path="/profile" component={Profile} />
          <ProtectedRoute path="/project-updates" component={ProjectUpdates} />
          <ProtectedRoute path="/resources" component={Resources} />
          <Route path="/:rest*" component={NotFound} />
        </Switch>
      </main>
      
      {isAuthenticated && location !== "/auth" && (
        <ErrorBoundary>
          <div className="fixed bottom-0 left-0 right-0 z-10">
            <BottomNavigation activePage={currentPage} />
          </div>
          <ActionButton currentPage={currentPage} />
        </ErrorBoundary>
      )}
    </div>
  );
}

function App() {
  // Initialize StatusBar
  useStatusBar();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="app-container bg-soft-gradient safe-height">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
