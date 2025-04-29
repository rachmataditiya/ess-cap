import { useState } from "react";
import { Link } from "wouter";
import { useCompanyAnnouncements } from "@/hooks/useOdoo";
import { formatDate, formatFullDate } from "@/lib/utils";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { ArrowLeftIcon, FilterIcon, BellIcon, AlertCircleIcon, CalendarIcon } from "lucide-react";

export default function Announcements() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [limit, setLimit] = useState(50); // Menampilkan 50 pengumuman
  const { data: announcements, isLoading } = useCompanyAnnouncements(limit);
  
  const categories = [
    { value: 'all', label: 'All Announcements' },
    { value: 'general', label: 'General' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'event', label: 'Events' },
    { value: 'policy', label: 'Policy Updates' },
  ];
  
  // Transform data from API to match our UI expectations
  const processedAnnouncements = announcements?.map(announcement => ({
    id: announcement.id,
    name: announcement.subject || "Announcement",
    message: announcement.body || "",
    date: announcement.date,
    author: announcement.author_id ? announcement.author_id[1] : "System",
    // Add simulated category and priority for UI demonstration
    // In production, these would come from the API
    category: announcement.subject?.toLowerCase().includes('urgent') ? 'urgent' :
             announcement.subject?.toLowerCase().includes('event') ? 'event' :
             announcement.subject?.toLowerCase().includes('policy') ? 'policy' : 'general',
    priority: announcement.subject?.toLowerCase().includes('urgent') ? 'high' : 'normal'
  }));
  
  // Filter announcements based on selected category
  const filteredAnnouncements = processedAnnouncements?.filter((announcement) => {
    if (selectedCategory === 'all') return true;
    return announcement.category === selectedCategory;
  });
  
  // Count urgent announcements
  const urgentCount = processedAnnouncements?.filter(a => a.priority === 'high').length || 0;
  
  return (
    <div className="px-5 pb-safe pt-6">
      {/* Header with back button - Similar to Calendar */}
      <header className="flex items-center mb-6">
        <Link href="/" className="mr-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Announcements</h1>
          <p className="text-slate-light text-sm">Company news and important updates</p>
        </div>
      </header>
      
      {/* Filter dropdown - Styled similarly to Calendar filter */}
      <div className="mb-6">
        <div className="relative flex items-center w-full modern-card-inset rounded-xl px-4 py-3.5">
          <BellIcon className="text-teal w-5 h-5 mr-3" />
          <select 
            className="appearance-none bg-transparent flex-1 text-navy focus:outline-none"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <FilterIcon className="w-5 h-5 text-slate" />
        </div>
      </div>
      
      {/* Total Urgent Announcements Summary Card - Similar to Calendar's Total Events card*/}
      <NeumorphicCard className="p-5 mb-6 bg-gradient-to-r from-teal/90 to-teal">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-full bg-soft-white/20 flex items-center justify-center mr-4">
            <AlertCircleIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-soft-white text-lg font-medium">Important Updates</h3>
            <p className="text-soft-white/70">Urgent announcements</p>
          </div>
          <div className="ml-auto">
            <span className="text-3xl font-bold text-white">{urgentCount}</span>
          </div>
        </div>
      </NeumorphicCard>
      
      {/* Announcements List Section */}
      <h2 className="text-xl font-semibold text-navy mb-4">All Announcements</h2>
      
      {/* Announcements List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
            <div className="loading-wave bg-teal"></div>
          </div>
        </div>
      ) : filteredAnnouncements && filteredAnnouncements.length > 0 ? (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement, index) => (
            <NeumorphicCard key={index} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-navy font-medium">{announcement.name}</h4>
                {announcement.category && (
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    announcement.category === 'urgent' ? 'bg-red-100 text-red-700' :
                    announcement.category === 'event' ? 'bg-blue-100 text-blue-700' :
                    announcement.category === 'policy' ? 'bg-purple-100 text-purple-700' :
                    'bg-teal/10 text-teal'
                  }`}>
                    {announcement.category}
                  </div>
                )}
              </div>
              
              <div className="flex items-center text-slate text-sm mb-3">
                <CalendarIcon className="w-4 h-4 mr-2 text-slate-light" />
                <span>{formatFullDate(announcement.date)}</span>
                {announcement.priority === 'high' && (
                  <span className="ml-2 flex items-center text-red-500">
                    <AlertCircleIcon className="w-4 h-4 mr-1" />
                    Urgent
                  </span>
                )}
              </div>
              
              <div className="text-slate text-sm mt-2" 
                   dangerouslySetInnerHTML={{ __html: announcement.message }}>
              </div>
            </NeumorphicCard>
          ))}
        </div>
      ) : (
        <NeumorphicCard className="p-8">
          <div className="flex flex-col items-center justify-center text-center">
            <BellIcon className="w-12 h-12 text-slate-light mb-4" />
            <h3 className="text-navy font-medium mb-2">No announcements</h3>
            <p className="text-slate text-sm">There are no announcements available at this time.</p>
          </div>
        </NeumorphicCard>
      )}
    </div>
  );
}