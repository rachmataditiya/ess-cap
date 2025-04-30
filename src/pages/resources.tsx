import { useState } from "react";
import { Link } from "wouter";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { formatDate, formatTime, formatFullDate } from "@/lib/utils";
import { useAllCalendarEvents } from "@/hooks/useOdoo";
import { CalendarIcon, ArrowLeftIcon, MapPinIcon, FilterIcon, UsersIcon } from "lucide-react";

interface CalendarEvent {
  id: number;
  name: string;
  start: string;
  stop: string;
  allday: boolean;
  location?: string;
  description?: string;
  employee_name: string;
}

export default function Resources() {
  const [filter, setFilter] = useState("today");
  const { data: allCalendarEvents, isLoading } = useAllCalendarEvents(30, filter);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value);
  };

  const getFilterLabel = () => {
    switch (filter) {
      case "today":
        return "Today's Events";
      case "week":
        return "This Week's Events";
      case "month":
        return "This Month's Events";
      default:
        return "All Events";
    }
  };
  
  return (
    <div className="px-5 pb-safe pt-6">
      {/* Header with back button */}
      <header className="flex items-center mb-6">
        <Link href="/" className="mr-4">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Resources</h1>
          <p className="text-slate-light text-sm">View all employees' schedules and events</p>
        </div>
      </header>

      {/* Filter dropdown */}
      <div className="mb-6">
        <div className="relative flex items-center w-full modern-card-inset rounded-xl px-4 py-3.5">
          <CalendarIcon className="text-teal w-5 h-5 mr-3" />
          <select 
            className="appearance-none bg-transparent flex-1 text-navy focus:outline-none"
            value={filter}
            onChange={handleFilterChange}
            aria-label="Filter events by time period"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <FilterIcon className="w-5 h-5 text-slate" />
        </div>
      </div>

      {/* Total Events Summary Card */}
      <NeumorphicCard className="p-5 mb-6 bg-gradient-to-r from-teal/90 to-teal">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-full bg-soft-white/20 flex items-center justify-center mr-4">
            <UsersIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-soft-white text-lg font-medium">Total Events</h3>
            <p className="text-soft-white/70">{getFilterLabel()}</p>
          </div>
          <div className="ml-auto">
            <span className="text-3xl font-bold text-white">{allCalendarEvents?.length || 0}</span>
          </div>
        </div>
      </NeumorphicCard>
      
      {/* Events List */}
      <h2 className="text-xl font-semibold text-navy mb-4">{getFilterLabel()}</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
          </div>
        </div>
      ) : allCalendarEvents && allCalendarEvents.length > 0 ? (
        <div className="space-y-4">
          {allCalendarEvents.map((event: CalendarEvent, index: number) => (
            <NeumorphicCard key={index} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-navy font-medium">{event.name}</h4>
                  <p className="text-slate text-sm mt-1">By: {event.employee_name}</p>
                </div>
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
                <div className="text-slate text-sm mt-3">
                  {event.description}
                </div>
              )}
            </NeumorphicCard>
          ))}
        </div>
      ) : (
        <NeumorphicCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <CalendarIcon className="w-12 h-12 text-slate-light mb-4" />
            <h3 className="text-navy font-medium mb-2">No events scheduled</h3>
            <p className="text-slate text-sm">There are no events scheduled for any employees {filter === "today" ? "today" : filter === "week" ? "this week" : "this month"}.</p>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}
