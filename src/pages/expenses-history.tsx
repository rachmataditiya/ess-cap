import { useState } from "react";
import { Link } from "wouter";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { useExpenses } from "@/hooks/useOdoo";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ReceiptIcon, ArrowLeftIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ExpensesHistory() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: expenses, isLoading } = useExpenses(100); // Get more expenses for history

  const filteredExpenses = expenses?.filter((expense: any) => {
    if (statusFilter === "all") return true;
    return expense.state === statusFilter;
  });

  return (
    <div className="px-5 pb-safe">
      {/* Header */}
      <header className="pt-6 pb-4 flex items-center">
        <Link href="/expenses" className="mr-4">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate"
            aria-label="Go back to expenses"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Expense History</h1>
          <p className="text-slate-light text-sm">View all your expense requests</p>
        </div>
      </header>

      {/* Filter */}
      <div className="mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Expenses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="reported">Reported</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="refused">Refused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expense List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
          </div>
        </div>
      ) : filteredExpenses && filteredExpenses.length > 0 ? (
        filteredExpenses.map((expense: any) => (
          <Link key={expense.id} to={`/expenses/${expense.id}`}>
            <NeumorphicCard className="p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-navy font-medium">{expense.name}</h4>
                  <div className="flex items-center mt-1 text-slate text-sm">
                    <span>{formatDate(expense.date)}</span>
                    {expense.description && (
                      <span className="ml-2 text-slate-light">"{expense.description}"</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    expense.state === 'approved' ? 'bg-green-100 text-green-700' :
                    expense.state === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                    expense.state === 'refused' ? 'bg-red-100 text-red-700' :
                    'bg-teal/10 text-teal'
                  }`}>
                    {expense.state.charAt(0).toUpperCase() + expense.state.slice(1)}
                  </span>
                  <span className="text-slate text-sm mt-1">
                    {expense.reference ? `Ref: ${expense.reference}` : "No reference"}
                  </span>
                  <span className="text-teal font-medium mt-1">
                    {formatCurrency(expense.total_amount)}
                  </span>
                </div>
              </div>
            </NeumorphicCard>
          </Link>
        ))
      ) : (
        <NeumorphicCard className="p-4">
          <div className="flex flex-col items-center justify-center text-center py-4">
            <ReceiptIcon className="w-12 h-12 text-slate-light mb-2" />
            <p className="text-navy font-medium">No expenses found</p>
            <p className="text-slate-light text-sm mt-1">
              You haven't submitted any expenses yet
            </p>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
} 