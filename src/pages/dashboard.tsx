import { useState, useEffect } from "react";
import { Link } from "wouter";
import { NeumorphicCard, NeumorphicButton } from "@/components/ui/neumorphic";
import {
  formatDate,
  formatCurrency,
  formatTime,
  formatFullDate,
  convertUTCtoJakartaTime,
} from "@/lib/utils";
import {
  useUserProfile,
  useLeaveBalance,
  useAttendance,
  useCompanyAnnouncements,
  useCalendarEvents,
  usePlanningProgress,
} from "@/hooks/useOdoo";
import {
  CalendarIcon,
  ClockIcon,
  CalendarDaysIcon,
  MapPinIcon,
  TargetIcon,
  BarChart3Icon,
  ReceiptIcon,
  Clock4Icon,
  UsersIcon,
} from "lucide-react";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState("");
  const { data: profile, isLoading: isProfileLoading } = useUserProfile();
  const { data: leaveBalances, isLoading: isLeaveLoading } = useLeaveBalance();
  const { data: currentAttendance, isLoading: isAttendanceLoading } =
    useAttendance();
  const { data: announcements, isLoading: isAnnouncementsLoading } =
    useCompanyAnnouncements();
  const { data: calendarEvents, isLoading: isCalendarLoading } =
    useCalendarEvents(3);
  const { data: planningProgress, isLoading: isPlanningLoading } =
    usePlanningProgress(2);

  // Debug logs
  console.log("Profile data:", profile);
  console.log("Leave balances:", leaveBalances);
  console.log("Current attendance:", currentAttendance);
  console.log("Announcements:", announcements);
  console.log("Calendar events:", calendarEvents);
  console.log("Planning progress:", planningProgress);

  useEffect(() => {
    const date = new Date();
    setCurrentDate(formatDate(date));
  }, []);

  // Calculate total available leave days
  const totalLeaveDays =
    leaveBalances?.reduce(
      (acc, leave) => acc + (leave.virtual_remaining_leaves || 0),
      0,
    ) || 0;

  // Calculate percentage of leave used
  const totalLeaveAllocation =
    leaveBalances?.reduce((acc, leave) => acc + (leave.max_leaves || 0), 0) ||
    1; // Avoid division by zero
  const leavePercentage = Math.round(
    (totalLeaveDays / totalLeaveAllocation) * 100,
  );

  // Format working time for current attendance
  const getAttendanceTime = () => {
    if (!currentAttendance) return { time: "--:--", duration: "00:00:00" };

    // Konversi waktu UTC ke Jakarta time
    const jakartaCheckIn = convertUTCtoJakartaTime(currentAttendance.check_in);
    const now = new Date();

    // Hitung durasi kerja
    let durationMs = 0;

    if (currentAttendance.status === "active") {
      // Jika masih active (belum checkout), hitung dari check in sampai sekarang
      durationMs = now.getTime() - jakartaCheckIn.getTime();
    } else if (currentAttendance.check_out) {
      // Jika sudah checkout, hitung dari check in sampai check out
      const jakartaCheckOut = convertUTCtoJakartaTime(
        currentAttendance.check_out,
      );
      durationMs = jakartaCheckOut.getTime() - jakartaCheckIn.getTime();
    }

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    return {
      time: formatTime(jakartaCheckIn),
      duration: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  };

  const [attendance, setAttendance] = useState(getAttendanceTime());

  useEffect(() => {
    if (currentAttendance) {
      const timer = setInterval(() => {
        setAttendance(getAttendanceTime());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentAttendance]);

  return (
    <div className="px-5 pb-safe">
      {/* Header Area */}
      <header className="pt-6 pb-4 flex justify-between items-center">
        {/* Profile Header */}
        <div className="flex items-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-teal flex items-center justify-center text-soft-white font-medium text-xl shadow-neumorph-sm">
              {profile?.name ? profile.name.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-soft-white flex items-center justify-center">
              <span className="material-icons-round text-white text-xs">
                check
              </span>
            </div>
          </div>
          <div className="ml-3">
            <h2 className="font-semibold text-navy text-lg">
              {isProfileLoading ? "Loading..." : profile?.name || "User"}
            </h2>
            <p className="text-slate-light text-xs">
              {isProfileLoading ? "..." : profile?.job_title || "Employee"}
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button className="w-10 h-10 rounded-full modern-card-sm flex items-center justify-center text-slate hover:text-navy transition-colors">
            <span className="material-icons-round">search</span>
          </button>
          <button className="w-10 h-10 rounded-full modern-card-sm flex items-center justify-center text-slate hover:text-navy transition-colors relative">
            <span className="material-icons-round">notifications</span>
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange text-white text-xs flex items-center justify-center">
              {announcements?.length || 0}
            </span>
          </button>
        </div>
      </header>

      {/* Today's Stats Summary */}
      <div className="mt-5 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Today's Overview</h3>
          <p className="text-slate-light text-sm">{currentDate}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Clock Status - Clickable, navigates to attendance page */}
          <Link to="/attendance">
            <NeumorphicCard className="p-4 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-teal/10"></div>
              <h4 className="text-slate text-sm mb-1">Status</h4>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-animation"></div>
                <p className="text-navy font-medium">
                  {currentAttendance
                    ? currentAttendance.status === "completed"
                      ? "Completed"
                      : "Clocked In"
                    : "Not Clocked In"}
                </p>
              </div>
              <p className="text-xs text-slate-light mt-2">
                {currentAttendance
                  ? `Since ${attendance.time}`
                  : "Tap to clock in"}
              </p>
              <div className="mt-2 text-xs text-teal font-medium">
                {currentAttendance ? attendance.duration : "--:--:--"}
              </div>
            </NeumorphicCard>
          </Link>

          {/* Leave Balance - Clickable, navigates to leave page */}
          <Link to="/leave">
            <NeumorphicCard className="p-4 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-orange/10"></div>
              <h4 className="text-slate text-sm mb-1">Leave Balance</h4>
              <p className="text-navy font-medium">{totalLeaveDays} days</p>
              <div className="mt-2 flex justify-between items-center">
                <div className="w-full bg-soft-gray rounded-full h-1.5">
                  <div
                    className="bg-orange h-1.5 rounded-full"
                    style={{ width: `${leavePercentage}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-xs text-slate-light whitespace-nowrap">
                  {leavePercentage}%
                </span>
              </div>
              <p className="text-xs text-slate-light mt-2">
                {leaveBalances && leaveBalances.length > 0
                  ? "Expires in 45 days"
                  : "No leave balance available"}
              </p>
            </NeumorphicCard>
          </Link>
        </div>
      </div>

      {/* Quick Access Icons */}
      <div className="mb-8">
        <div className="grid grid-cols-3 gap-4">
          <Link to="/expenses">
            <NeumorphicCard className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center">
                <ReceiptIcon className="w-6 h-6 text-teal mb-2" />
                <span className="text-sm font-medium text-navy">Expenses</span>
              </div>
            </NeumorphicCard>
          </Link>
          
          <NeumorphicCard className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center">
              <Clock4Icon className="w-6 h-6 text-teal mb-2" />
              <span className="text-sm font-medium text-navy">Timesheet</span>
            </div>
          </NeumorphicCard>
          
          <NeumorphicCard className="p-4 text-center cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center">
              <UsersIcon className="w-6 h-6 text-teal mb-2" />
              <span className="text-sm font-medium text-navy">Resources</span>
            </div>
          </NeumorphicCard>
        </div>
      </div>

      {/* Planning Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Planning Progress</h3>
          <Link to="/project-updates" className="text-teal text-sm font-medium flex items-center">
            <TargetIcon className="w-4 h-4 mr-1" />
            <span>View all</span>
          </Link>
        </div>

        {isPlanningLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : planningProgress && planningProgress.length > 0 ? (
          planningProgress.map((plan: any, index: number) => (
            <Link key={index} to="/project-updates" className="block">
              <NeumorphicCard className="p-4 mb-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-navy font-medium">{plan.name}</h4>
                    <p className="text-xs text-slate-light mt-1">
                      {plan.department_id?.[1] || "Department"}
                    </p>
                  </div>
                  <div className="bg-teal/10 text-teal text-xs px-2 py-1 rounded-full font-medium">
                    {plan.percentAchieved}% Completed
                  </div>
                </div>
                
                <div className="mt-3 mb-1 flex justify-between items-center text-sm">
                  <div className="text-slate-light">Progress</div>
                  <div className="text-navy font-medium">
                    {plan.achieve_points} / {plan.target_points} points
                  </div>
                </div>
                
                <div className="w-full bg-soft-gray rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${plan.statusColor}`} 
                    style={{ width: `${plan.percentAchieved}%` }}
                  ></div>
                </div>
                
                <div className="mt-3 flex justify-between text-xs text-slate-light">
                  <div>Start: {formatDate(plan.start_date)}</div>
                  <div>End: {formatDate(plan.end_date)}</div>
                </div>
              </NeumorphicCard>
            </Link>
          ))
        ) : (
          <NeumorphicCard className="p-4 mb-4">
            <div className="flex flex-col items-center justify-center text-center py-4">
              <BarChart3Icon className="w-12 h-12 text-slate-light mb-2" />
              <p className="text-navy font-medium">No planning data</p>
              <p className="text-slate-light text-sm mt-1">
                No active planning or targets found
              </p>
            </div>
          </NeumorphicCard>
        )}
      </div>

      {/* Company News */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Company News</h3>
          <Link to="/announcements" className="text-teal text-sm font-medium">
            View all
          </Link>
        </div>

        {isAnnouncementsLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : announcements && announcements.length > 0 ? (
          announcements.slice(0, 2).map((news, index) => (
            <NeumorphicCard key={index} className="p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-navy font-medium">
                    {news.subject || "Announcement"}
                  </h4>
                  <p className="text-xs text-slate-light mt-1">
                    Posted {new Date(news.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-teal/10 text-teal text-xs px-2 py-1 rounded-full font-medium">
                  Announcement
                </div>
              </div>
              <div
                className="text-slate text-sm mt-3 line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: news.body || "No content available",
                }}
              ></div>
            </NeumorphicCard>
          ))
        ) : (
          <NeumorphicCard className="p-4 mb-4">
            <p className="text-slate text-center py-2">
              No announcements available
            </p>
          </NeumorphicCard>
        )}
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Upcoming Events</h3>
          <Link to="/calendar" className="text-teal text-sm font-medium">
            View calendar
          </Link>
        </div>

        {isCalendarLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : calendarEvents && calendarEvents.length > 0 ? (
          calendarEvents.map((event, index) => (
            <div key={index} className="flex items-start mb-4 relative pl-6">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-soft-gray"></div>
              <div className="absolute left-0 top-0 w-2 h-2 rounded-full bg-teal -translate-x-0.5"></div>
              <NeumorphicCard className="p-4 w-full">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-navy font-medium">{event.name}</h4>
                  <div className="bg-teal/10 text-teal text-xs px-2 py-1 rounded-full font-medium">
                    {event.allday ? "All day" : "Event"}
                  </div>
                </div>

                <div className="flex items-center text-slate text-sm mb-2">
                  <CalendarIcon className="w-4 h-4 mr-2 text-slate-light" />
                  <span>{formatFullDate(event.start)}</span>
                  {!event.allday && (
                    <span className="ml-2">
                      {formatTime(event.start)} - {formatTime(event.stop)}
                    </span>
                  )}
                </div>

                {event.location && (
                  <div className="flex items-center text-slate text-sm mb-2">
                    <MapPinIcon className="w-4 h-4 mr-2 text-slate-light" />
                    <span>{event.location}</span>
                  </div>
                )}

                {event.description && (
                  <div className="text-slate text-sm mt-3 line-clamp-2">
                    {event.description}
                  </div>
                )}
              </NeumorphicCard>
            </div>
          ))
        ) : (
          <NeumorphicCard className="p-4 mb-4">
            <div className="flex items-center justify-center py-4 text-slate">
              <CalendarDaysIcon className="w-5 h-5 mr-2 text-slate-light" />
              <p>No upcoming events</p>
            </div>
          </NeumorphicCard>
        )}
      </div>
    </div>
  );
}
