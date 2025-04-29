import { useState } from "react";
import { Link } from "wouter";
import { useLeaveRequests } from "@/hooks/useOdoo";
import { formatDate } from "@/lib/utils";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { FilterIcon, ArrowLeftIcon, CalendarIcon } from "lucide-react";

export default function LeaveHistory() {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [limit, setLimit] = useState(30); // Menampilkan 30 riwayat cuti
  const { data: leaveHistory, isLoading } = useLeaveRequests('all', limit);
  
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
  
  // Filter leave records based on selected month
  const filteredHistory = leaveHistory?.filter((record: any) => {
    if (selectedMonth === 'all') return true;
    
    const recordDate = new Date(record.date_from);
    const recordMonth = `${recordDate.getMonth() + 1}`.padStart(2, '0');
    return recordMonth === selectedMonth;
  });
  
  return (
    <div className="px-5 pb-safe pt-6">
      {/* Header with back button - Similar to Calendar */}
      <header className="flex items-center mb-6">
        <Link href="/leave" className="mr-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Leave History</h1>
          <p className="text-slate-light text-sm">Your leave requests and approvals</p>
        </div>
      </header>
      
      {/* Filter Dropdown */}
      <div className="mb-6">
        <div className="relative flex items-center w-full modern-card-inset rounded-xl px-4 py-3.5">
          <CalendarIcon className="text-teal w-5 h-5 mr-3" />
          <select 
            className="appearance-none bg-transparent flex-1 text-navy focus:outline-none"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <FilterIcon className="w-5 h-5 text-slate" />
        </div>
      </div>
      
      {/* Summary Card */}
      <NeumorphicCard className="p-5 mb-6 bg-gradient-to-r from-teal/90 to-teal">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-full bg-soft-white/20 flex items-center justify-center mr-4">
            <CalendarIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg">Total Leave Days</h3>
            <p className="text-white/80 text-sm">
              {selectedMonth === 'all' 
                ? 'All time'
                : `${months.find(m => m.value === selectedMonth)?.label} ${new Date().getFullYear()}`}
            </p>
          </div>
          <span className="text-white font-bold text-3xl">
            {filteredHistory?.reduce((total: number, record: any) => {
              return total + (record.number_of_days || 0);
            }, 0).toFixed(1)} days
          </span>
        </div>
      </NeumorphicCard>
      
      {/* Leave List */}
      <div>
        <h2 className="text-xl font-semibold text-navy mb-4">Leave Records</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : filteredHistory && filteredHistory.length > 0 ? (
          <div className="space-y-4">
            {filteredHistory.map((leave: any, index: number) => (
              <NeumorphicCard key={index} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-navy font-medium">
                    {leave.holiday_status_id?.[1] || "Leave"}
                  </h4>
                  <div className={`
                    ${leave.state === 'validate' ? 'bg-green-100 text-green-700' : 
                      leave.state === 'confirm' ? 'bg-yellow-100 text-yellow-700' : 
                      leave.state === 'refuse' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'} 
                    text-xs px-2 py-1 rounded-full font-medium
                  `}>
                    {leave.state === 'validate' ? 'Approved' : 
                     leave.state === 'confirm' ? 'Pending' : 
                     leave.state === 'refuse' ? 'Refused' : 'Draft'}
                  </div>
                </div>
                
                <p className="text-slate text-sm mb-2">
                  {leave.name || "Leave Request"}
                </p>
                
                <div className="flex items-center text-slate text-sm mb-2">
                  <CalendarIcon className="w-4 h-4 mr-2 text-slate-light" />
                  <span>{formatDate(leave.date_from)} - {formatDate(leave.date_to)}</span>
                </div>
                
                <p className="text-xs text-slate-light mt-1">
                  {leave.number_of_days} {leave.number_of_days === 1 ? "day" : "days"}
                </p>
              </NeumorphicCard>
            ))}
          </div>
        ) : (
          <NeumorphicCard className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <CalendarIcon className="w-12 h-12 text-slate-light mb-4" />
              <h3 className="text-navy font-medium mb-2">No leave records</h3>
              <p className="text-slate text-sm">You don't have any leave records for this period.</p>
            </div>
          </NeumorphicCard>
        )}
      </div>
    </div>
  );
}