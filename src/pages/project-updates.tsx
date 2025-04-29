import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { NeumorphicCard, NeumorphicButton } from "@/components/ui/neumorphic";
import { formatDate } from "@/lib/utils";
import { useProjectUpdates } from "@/hooks/useOdoo";
import {
  BarChart3Icon,
  ArrowLeftIcon,
  CalendarIcon,
  BuildingIcon,
  TargetIcon,
  ChartBarIcon,
  ListChecksIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function ProjectUpdatesPage() {
  const [, navigate] = useLocation();
  
  // State for month and year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  // Fetch project update data
  const { data, isLoading, isError } = useProjectUpdates(selectedMonth, selectedYear);
  
  // Generate months for dropdown
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Generate years (current year and previous 2 years)
  const years = [
    currentDate.getFullYear(),
    currentDate.getFullYear() - 1,
    currentDate.getFullYear() - 2
  ];
  
  // Handle filter changes
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  };
  
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };
  
  // Format trend data for chart
  const formatTrendData = () => {
    if (!data || !data.trendData) return [];
    
    return data.trendData.map((item: any) => {
      const date = new Date(item.start_date);
      return {
        month: `${months[date.getMonth()].substring(0, 3)} '${date.getFullYear().toString().substring(2)}`,
        achievement: parseFloat((item.achieve_percentage || 0).toFixed(2)),
        target: 100
      };
    });
  };
  
  // Calculate total planned points
  const totalPlannedPoints = data?.slotLinesData?.reduce((total: number, item: any) => 
    total + (item.planned_points || 0), 0) || 0;
  
  // Calculate total progress points
  const totalProgressPoints = data?.updateLinesData?.reduce((total: number, item: any) => 
    total + (item.progress_point || 0), 0) || 0;
  
  return (
    <div className="px-5 pb-safe">
      {/* Header Area with Back Button */}
      <header className="pt-6 pb-4 flex items-center">
        <NeumorphicButton 
          onClick={() => navigate('/')}
          className="mr-4 w-10 h-10 flex items-center justify-center text-slate hover:text-navy transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </NeumorphicButton>
        <div>
          <h1 className="text-xl font-semibold text-navy">Project Updates</h1>
          <p className="text-sm text-slate-light">View your project performance</p>
        </div>
      </header>
      
      {/* Period Filter */}
      <NeumorphicCard className="p-4 mb-6">
        <div className="flex items-center mb-3">
          <CalendarIcon className="w-5 h-5 text-teal mr-2" />
          <h3 className="text-navy font-medium">Select Period</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-light mb-1 block">Month</label>
            <select 
              value={selectedMonth} 
              onChange={handleMonthChange} 
              className="w-full p-2 rounded-lg bg-soft-white border border-soft-gray text-navy focus:outline-none focus:border-teal"
              aria-label="Select Month"
            >
              {months.map((month, index) => (
                <option key={month} value={index}>{month}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm text-slate-light mb-1 block">Year</label>
            <select 
              value={selectedYear} 
              onChange={handleYearChange} 
              className="w-full p-2 rounded-lg bg-soft-white border border-soft-gray text-navy focus:outline-none focus:border-teal"
              aria-label="Select Year"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </NeumorphicCard>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
          </div>
        </div>
      ) : isError ? (
        <NeumorphicCard className="p-6 text-center mb-6">
          <BarChart3Icon className="w-12 h-12 text-slate-light mb-3 mx-auto" />
          <h3 className="text-navy font-medium mb-2">Error Loading Data</h3>
          <p className="text-slate-light">Could not load project data. Please try again later.</p>
        </NeumorphicCard>
      ) : (
        <>
          {/* Monthly Summary - If no data found */}
          {!data?.planningData || data.planningData.length === 0 ? (
            <NeumorphicCard className="p-6 text-center mb-6">
              <BarChart3Icon className="w-12 h-12 text-slate-light mb-3 mx-auto" />
              <h3 className="text-navy font-medium mb-2">No Planning Data</h3>
              <p className="text-slate-light">No project data available for this period.</p>
            </NeumorphicCard>
          ) : (
            <>
              {/* Monthly Summary Cards */}
              {data.planningData.map((plan: any, index: number) => (
                <NeumorphicCard key={index} className="p-4 mb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-navy font-medium">{plan.name}</h3>
                      <p className="text-xs text-slate-light mt-1">
                        {formatDate(plan.start_date)} - {formatDate(plan.end_date)}
                      </p>
                    </div>
                    {plan.department_id && (
                      <div className="bg-teal/10 text-teal text-xs px-2 py-1 rounded-full font-medium flex items-center">
                        <BuildingIcon className="w-3 h-3 mr-1" />
                        {plan.department_id[1]}
                      </div>
                    )}
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    {/* Target Points */}
                    <div className="bg-soft-gray/30 p-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        <TargetIcon className="w-4 h-4 text-slate-light mr-1" />
                        <span className="text-xs text-slate-light">Target</span>
                      </div>
                      <p className="text-navy font-medium">{plan.target_points} pts</p>
                      <div className="w-full bg-soft-gray h-1.5 rounded-full mt-2">
                        <div className="bg-blue-400 h-1.5 rounded-full w-full"></div>
                      </div>
                    </div>
                    
                    {/* Achievement */}
                    <div className="bg-soft-gray/30 p-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        <ChartBarIcon className="w-4 h-4 text-slate-light mr-1" />
                        <span className="text-xs text-slate-light">Achievement</span>
                      </div>
                      <p className="text-navy font-medium">{plan.achieve_percentage?.toFixed(1) || 0}%</p>
                      <div className="w-full bg-soft-gray h-1.5 rounded-full mt-2">
                        <div 
                          className={`${plan.statusColor} h-1.5 rounded-full`} 
                          style={{ width: `${plan.achieve_percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Planned Progress */}
                    <div className="bg-soft-gray/30 p-3 rounded-lg">
                      <div className="flex items-center mb-2">
                        <ListChecksIcon className="w-4 h-4 text-slate-light mr-1" />
                        <span className="text-xs text-slate-light">Planned</span>
                      </div>
                      <p className="text-navy font-medium">{plan.planned_percentage?.toFixed(1) || 0}%</p>
                      <div className="w-full bg-soft-gray h-1.5 rounded-full mt-2">
                        <div 
                          className={`${plan.planningColor} h-1.5 rounded-full`}
                          style={{ width: `${plan.planned_percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </NeumorphicCard>
              ))}
            </>
          )}
          
          {/* Achievement Trend Chart */}
          <NeumorphicCard className="p-4 mb-6">
            <h3 className="text-navy font-medium mb-4">Achievement vs Target Trend</h3>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={formatTrendData()}
                  margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, '']}
                    labelStyle={{ color: '#0f172a' }}
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      borderRadius: '8px',
                      borderColor: '#e5e7eb'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="achievement" 
                    name="Achievement" 
                    stroke="#14b8a6" 
                    strokeWidth={2} 
                    dot={{ stroke: '#14b8a6', strokeWidth: 2, r: 4, fill: '#14b8a6' }}
                    activeDot={{ r: 6, stroke: '#14b8a6', fill: '#14b8a6' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    name="Target" 
                    stroke="#64748b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </NeumorphicCard>
          
          {/* Planned Points */}
          <NeumorphicCard className="p-4 mb-6">
            <div className="flex items-center mb-4">
              <ListChecksIcon className="w-5 h-5 text-teal mr-2" />
              <h3 className="text-navy font-medium">Planned Points</h3>
            </div>
            
            {!data?.slotLinesData || data.slotLinesData.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate">No planned points data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.slotLinesData.map((slot: any, index: number) => (
                  <div key={index} className="bg-soft-gray/10 p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="text-navy font-medium text-sm">
                          {slot.project_id ? slot.project_id[1] : 'N/A'}
                        </h4>
                        <p className="text-slate-light text-xs mt-1">{slot.name}</p>
                      </div>
                      <div className="bg-teal/10 text-teal text-xs px-3 py-1 rounded-full font-medium ml-2">
                        {slot.planned_points} pts
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-slate mt-2">
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      <span>{slot.period || 'No period specified'}</span>
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-soft-gray flex justify-between items-center">
                  <span className="text-navy font-medium">Total Points</span>
                  <span className="text-teal font-medium">{totalPlannedPoints} pts</span>
                </div>
              </div>
            )}
          </NeumorphicCard>
          
          {/* Actual Progress */}
          <NeumorphicCard className="p-4 mb-6">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="w-5 h-5 text-teal mr-2" />
              <h3 className="text-navy font-medium">Actual Progress</h3>
            </div>
            
            {!data?.updateLinesData || data.updateLinesData.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate">No progress data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.updateLinesData.map((update: any, index: number) => (
                  <div key={index} className="bg-soft-gray/10 p-4 rounded-xl">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-navy font-medium text-sm">
                          {update.project_id ? update.project_id[1] : 'N/A'}
                        </h4>
                        <p className="text-slate-light text-xs mt-1">{update.name}</p>
                      </div>
                      <div className="bg-teal/10 text-teal text-xs px-3 py-1 rounded-full font-medium ml-2">
                        {update.progress_point} pts
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Previous Progress */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-light">Previous Progress</span>
                          <span className="text-navy">{update.previous_progress || 0}%</span>
                        </div>
                        <div className="w-full bg-soft-gray h-1.5 rounded-full">
                          <div 
                            className="bg-indigo-400 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${update.previous_progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Current Progress */}
                      <div>
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-light">Current Progress</span>
                          <span className="text-navy">{update.update_progress || 0}%</span>
                        </div>
                        <div className="w-full bg-soft-gray h-1.5 rounded-full">
                          <div 
                            className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${update.update_progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-soft-gray flex justify-between items-center">
                  <span className="text-navy font-medium">Total Points</span>
                  <span className="text-teal font-medium">{totalProgressPoints} pts</span>
                </div>
              </div>
            )}
          </NeumorphicCard>
        </>
      )}
    </div>
  );
}