import { useState } from "react";
import { Link } from "wouter";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { usePayslips, usePayslipDetails } from "@/hooks/useOdoo";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/loading-skeleton";

export default function Payslips() {
  const { data: payslips, isLoading } = usePayslips();
  const [selectedPayslip, setSelectedPayslip] = useState<number | null>(null);
  const [showSalary, setShowSalary] = useState(false);
  const { data: payslipDetails, isLoading: isDetailsLoading } =
    usePayslipDetails(selectedPayslip || 0);

  // Get the latest payslip if available
  const latestPayslip = payslips && payslips.length > 0 ? payslips[0] : null;

  // Show loading skeleton if data is loading
  if (isLoading) {
    return <PageSkeleton />;
  }

  // Show error message if data failed to load
  if (!payslips && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 min-h-[50vh]">
        <div className="text-red-500 mb-4 text-4xl">!</div>
        <h3 className="text-lg font-semibold mb-2">
          Failed to load payslip data
        </h3>
        <p className="text-slate-600 mb-4">
          Please check your connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-teal text-white px-4 py-2 rounded-md text-sm"
        >
          Refresh
        </button>
      </div>
    );
  }

  // Function to mask salary
  const maskSalary = (amount: number) => {
    return showSalary ? formatCurrency(amount) : "••••••";
  };

  return (
    <div className="px-5 pb-safe">
      {/* Latest Payslip */}
      <div className="mt-4 mb-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : latestPayslip ? (
          <Link
            to={`/payslips/${latestPayslip.id}`}
            style={{ display: "block", width: "100%" }}
          >
            <NeumorphicCard className="p-5 border-t-4 border-teal hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block bg-teal-50 text-teal p-1.5 rounded-md">
                      <span className="material-icons-round text-teal text-lg">
                        receipt_long
                      </span>
                    </span>
                    <h3 className="text-navy font-semibold text-lg">
                      Latest Payslip
                    </h3>
                  </div>
                  <p className="text-slate-light text-sm mt-1 ml-9">
                    {formatMonth(latestPayslip.date_from)}
                  </p>
                </div>
                <span className="text-teal text-sm flex items-center font-medium">
                  View Details
                  <span className="material-icons-round text-sm ml-1">
                    arrow_forward
                  </span>
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mt-2">
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <p className="text-slate-light text-xs mb-1">Net Salary</p>
                    <p className="text-navy font-semibold text-lg">
                      {maskSalary(latestPayslip.net_wage || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-light text-xs mb-1">
                      Gross Salary
                    </p>
                    <p className="text-navy font-medium">
                      {maskSalary((latestPayslip.net_wage || 0) * 1.2)}{" "}
                      {/* Simulated gross */}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-light text-xs mb-1">
                      Payment Date
                    </p>
                    <p className="text-slate">
                      {formatDate(latestPayslip.date_to)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-light text-xs mb-1">
                      Payment Method
                    </p>
                    <p className="text-slate">Bank Transfer</p>
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          </Link>
        ) : (
          <NeumorphicCard className="p-5">
            <p className="text-slate text-center">No payslips available</p>
          </NeumorphicCard>
        )}
      </div>

      {/* All Payslips */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Payslip History</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSalary(!showSalary)}
              className="text-teal hover:text-teal-600 transition-colors"
            >
              <span className="material-icons-round">
                {showSalary ? "visibility" : "visibility_off"}
              </span>
            </button>
            <Link
              to="/payslips-history"
              className="text-teal text-sm font-medium"
            >
              View all
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : payslips && payslips.length > 0 ? (
          payslips.map((payslip, index) => (
            <Link
              key={index}
              to={`/payslips/${payslip.id}`}
              style={{ display: "block", width: "100%" }}
            >
              <NeumorphicCard className="p-4 mb-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center mb-1">
                      <span className="material-icons-round text-teal mr-2 text-sm">
                        receipt
                      </span>
                      <h4 className="text-navy font-medium">
                        {formatMonth(payslip.date_from)}
                      </h4>
                    </div>
                    <div className="flex items-center mt-1 bg-slate-50 px-3 py-1 rounded-full">
                      <span className="text-slate text-sm flex items-center">
                        <span className="material-icons-round text-teal mr-1 text-xs">
                          calendar_today
                        </span>
                        {formatDate(payslip.date_to)}
                      </span>
                      <span className="mx-2 text-slate-light">•</span>
                      <span className="text-teal text-sm font-medium flex items-center">
                        <span className="material-icons-round text-teal mr-1 text-xs">
                          payments
                        </span>
                        {maskSalary(payslip.net_wage || 0)}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-50 text-teal">
                    <span className="material-icons-round">visibility</span>
                  </div>
                </div>
              </NeumorphicCard>
            </Link>
          ))
        ) : (
          <NeumorphicCard className="mb-4 p-8 text-center">
            <div className="flex flex-col items-center">
              <span className="material-icons-round text-3xl text-slate-300 mb-2">
                receipt_long
              </span>
              <p className="text-slate">No payslips available</p>
              <p className="text-slate-400 text-sm mt-1">
                Your payslips will appear here once processed
              </p>
            </div>
          </NeumorphicCard>
        )}
      </div>
    </div>
  );
}
