import { useState } from "react";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { getInitials } from "@/lib/utils";
import { useUserProfile, useOdooAuth } from "@/hooks/useOdoo";

export default function Profile() {
  const { data: profile, isLoading } = useUserProfile();
  const { logout, isLogoutPending } = useOdooAuth();
  
  const handleLogout = () => {
    logout();
  };

  if (isLoading) {
    return (
      <div className="px-5 pb-6 flex justify-center items-center min-h-[60vh]">
        <div className="flex items-center space-x-2">
          <div className="loading-wave bg-teal"></div>
          <div className="loading-wave bg-teal"></div>
          <div className="loading-wave bg-teal"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-20">
      {/* Profile Header */}
      <div className="mt-4 mb-6 text-center">
        <div className="relative w-24 h-24 mx-auto mb-3">
          {profile?.image_128 ? (
            <div className="w-full h-full rounded-full shadow-neumorph overflow-hidden">
              <img 
                src={`data:image/jpeg;base64,${profile.image_128}`} 
                alt={profile.name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-full rounded-full bg-teal flex items-center justify-center text-soft-white font-semibold text-4xl shadow-neumorph">
              {profile?.name ? getInitials(profile.name) : 'U'}
            </div>
          )}
          <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center shadow-lg">
            <span className="material-icons-round text-sm">edit</span>
          </button>
        </div>
        <h2 className="text-navy font-semibold text-xl">{profile?.name || 'User'}</h2>
        <p className="text-slate-light">{profile?.job_title || 'Employee'}</p>
        <p className="text-slate text-sm mt-1">
          {profile?.department_id ? profile.department_id[1] : 'Department'} Department
        </p>
      </div>
      
      {/* Profile Sections */}
      <div className="mb-6">
        <NeumorphicCard className="p-5 mb-4">
          <h3 className="text-navy font-semibold mb-4">Personal Information</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-slate-light text-xs mb-1">Email Address</p>
              <p className="text-navy">{profile?.work_email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Phone Number</p>
              <p className="text-navy">{profile?.mobile_phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Date of Birth</p>
              <p className="text-navy">
                {profile?.birthday ? new Date(profile.birthday).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Address</p>
              <p className="text-navy">
                {profile?.address_home_id ? profile.address_home_id[1] : 'N/A'}
              </p>
            </div>
          </div>
          
          <button className="text-teal font-medium text-sm mt-4 flex items-center">
            <span className="material-icons-round text-sm mr-1">edit</span>
            Edit Information
          </button>
        </NeumorphicCard>
        
        <NeumorphicCard className="p-5 mb-4">
          <h3 className="text-navy font-semibold mb-4">Employment Details</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-slate-light text-xs mb-1">Employee ID</p>
              <p className="text-navy">{profile?.registration_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Join Date</p>
              <p className="text-navy">
                {profile?.date_join ? new Date(profile.date_join).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Contract Type</p>
              <p className="text-navy">Full-time, Permanent</p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Manager</p>
              <p className="text-navy">
                {profile?.parent_id ? profile.parent_id[1] : 'N/A'}
              </p>
            </div>
          </div>
        </NeumorphicCard>
        
        <NeumorphicCard className="p-5">
          <h3 className="text-navy font-semibold mb-4">Emergency Contact</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-slate-light text-xs mb-1">Name</p>
              <p className="text-navy">{profile?.emergency_contact || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Relationship</p>
              <p className="text-navy">Family</p>
            </div>
            <div>
              <p className="text-slate-light text-xs mb-1">Phone Number</p>
              <p className="text-navy">{profile?.emergency_phone || 'N/A'}</p>
            </div>
          </div>
          
          <button className="text-teal font-medium text-sm mt-4 flex items-center">
            <span className="material-icons-round text-sm mr-1">edit</span>
            Edit Contact
          </button>
        </NeumorphicCard>
      </div>
      
      {/* Logout Button */}
      <button 
        className="w-full neumorphic rounded-xl p-4 flex items-center justify-center text-red-500 font-medium"
        onClick={handleLogout}
        disabled={isLogoutPending}
      >
        {isLogoutPending ? (
          <div className="flex items-center justify-center space-x-1">
            <div className="loading-wave bg-red-500"></div>
            <div className="loading-wave bg-red-500"></div>
            <div className="loading-wave bg-red-500"></div>
          </div>
        ) : (
          <>
            <span className="material-icons-round mr-2">logout</span>
            Sign Out
          </>
        )}
      </button>
    </div>
  );
}
