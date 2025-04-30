import { useState } from "react";
import { Link } from "wouter";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { formatDate, formatTime, formatFullDate, calculateDuration } from "@/lib/utils";
import { useAttendanceHistory, useWeeklyAttendance } from "@/hooks/useOdoo";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import { FilterIcon, ArrowLeftIcon, ClockIcon } from "lucide-react";

// Types
interface WeeklyAttendance {
  date: string;
  worked_hours: number;
}

export default function AttendanceHistory() {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [limit, setLimit] = useState(30); // Tampilkan 30 riwayat
  const { data: attendanceHistory, isLoading, error } = useAttendanceHistory(limit);
  const { data: weeklyData, isLoading: isWeeklyLoading } = useWeeklyAttendance();
  
  // Filter options
  const months = [
    { value: 'all', label: 'All Time' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];
  
  // Filter attendance records based on selected month
  const filteredAttendance = attendanceHistory?.filter((record: any) => {
    if (selectedMonth === 'all') return true;
    
    const recordDate = new Date(record.check_in);
    const recordMonth = `${recordDate.getMonth() + 1}`.padStart(2, '0');
    return recordMonth === selectedMonth;
  });

  // Show loading skeleton if data is loading
  if (isLoading) {
    return <PageSkeleton />;
  }

  // Show error message if data failed to load
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 min-h-[50vh]">
        <div className="text-red-500 mb-4 text-4xl">!</div>
        <h3 className="text-lg font-semibold mb-2">Failed to load attendance data</h3>
        <p className="text-slate-600 mb-4">Please check your connection and try again.</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-teal text-white px-4 py-2 rounded-md text-sm"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pb-safe pt-6">
      {/* Header with back button */}
      <header className="flex items-center mb-6">
        <Link href="/attendance" className="mr-4">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate"
            aria-label="Back to attendance"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Attendance History</h1>
          <p className="text-slate-light text-sm">Your time tracking and work hours</p>
        </div>
      </header>
      
      {/* Filter */}
      <div className="mb-6">
        <div className="relative flex items-center w-full modern-card-inset rounded-xl px-4 py-3.5">
          <ClockIcon className="text-teal w-5 h-5 mr-3" />
          <select 
            className="appearance-none bg-transparent flex-1 text-navy focus:outline-none"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Filter by month"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <FilterIcon className="w-5 h-5 text-slate" />
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Weekly Summary</h3>
          <span className="text-teal-600 text-xs px-3 py-1 rounded-full bg-teal-50 border border-teal-100">
            {new Date().toLocaleDateString("en", {
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <NeumorphicCard className="p-5 border-l-4 border-teal">
          {isWeeklyLoading ? (
            <div className="flex justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="loading-wave bg-teal"></div>
                <div className="loading-wave bg-teal"></div>
                <div className="loading-wave bg-teal"></div>
              </div>
            </div>
          ) : weeklyData && typeof weeklyData === 'object' && weeklyData.dailyHours ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-slate text-sm">
                  {`Week of ${formatDate(weeklyData.startDate).split(",")[0]} - ${formatDate(weeklyData.endDate).split(",")[0]}`}
                </p>
                <div className="text-teal text-sm font-medium">
                  {`${weeklyData.totalWorkedHours.toFixed(1)}h / ${weeklyData.standardHours}h`}
                </div>
              </div>

              {/* Weekly Chart */}
              <div className="h-40 flex items-end justify-between space-x-1">
                {weeklyData.dailyHours.map((day: any, index: number) => (
                  <div
                    key={index}
                    className="flex flex-col items-center space-y-2 relative w-12"
                  >
                    <div className="absolute top-[-20px] text-xs text-slate-400">
                      {day.hours > 0 && `${day.hours.toFixed(1)}h`}
                    </div>
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        day.inactive
                          ? "bg-slate-100"
                          : day.hours > 0
                            ? "bg-teal/20 hover:bg-teal/30"
                            : "bg-slate-50"
                      }`}
                      style={{
                        height: `${day.percent}px`,
                        boxShadow: day.hours > 0 ? "inset 0 2px 4px rgba(45, 212, 191, 0.1)" : "none"
                      }}
                    ></div>
                    <p className="text-xs text-slate-light">{day.day}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-slate">
              No weekly data available
            </div>
          )}
        </NeumorphicCard>
      </div>

      {/* Attendance History List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Attendance Records</h3>
        </div>
        {filteredAttendance && filteredAttendance.length > 0 ? (
          filteredAttendance.map((record: any, index: number) => (
            <NeumorphicCard key={index} className="p-4 mb-4 border-r-4 border-teal">
              <div>
                <div className="flex items-center mb-1">
                  <span className="material-icons-round text-teal mr-2 text-sm">
                    event
                  </span>
                  <h4 className="text-navy font-medium">
                    {formatFullDate(record.check_in).split(",")[0]}
                  </h4>
                </div>
                <div className="flex items-center mt-1 bg-slate-50 px-3 py-1 rounded-full">
                  <span className="text-slate text-sm flex items-center">
                    <span className="material-icons-round text-teal mr-1 text-xs">
                      schedule
                    </span>
                    {formatTime(record.check_in)} - {formatTime(record.check_out)}
                  </span>
                  <span className="mx-2 text-slate-light">•</span>
                  <span className="text-teal text-sm font-medium flex items-center">
                    <span className="material-icons-round text-teal mr-1 text-xs">
                      timer
                    </span>
                    {record.worked_hours
                      ? (() => {
                          const hours = Math.floor(record.worked_hours);
                          const minutes = Math.round((record.worked_hours - hours) * 60);
                          return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
                        })()
                      : calculateDuration(
                          new Date(record.check_in),
                          new Date(record.check_out)
                        )}
                  </span>
                </div>
              </div>
            </NeumorphicCard>
          ))
        ) : (
          <div className="modern-card p-4 mb-4 rounded-xl shadow-sm">
            <p className="text-slate text-center py-4">No attendance records found</p>
          </div>
        )}
      </div>
    </div>
  );
}