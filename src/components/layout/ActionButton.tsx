import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAttendance, useCheckInOut } from "@/hooks/useOdoo";

interface ActionButtonProps {
  currentPage: string;
}

interface ActionConfig {
  icon: string;
  background: string;
  action: () => void;
  label?: string;
}

export default function ActionButton({ currentPage }: ActionButtonProps) {
  const [, setLocation] = useLocation();
  const [isPressed, setIsPressed] = useState(false);
  const { data: currentAttendance } = useAttendance();
  const { checkIn, checkOut, isCheckingIn, isCheckingOut } = useCheckInOut();
  
  // Define context-specific actions
  const getActionConfig = (page: string): ActionConfig => {
    switch (page) {
      case "dashboard":
        return {
          icon: "search",
          background: "bg-teal",
          label: "Search",
          action: () => {
            // Open search dialog
            alert("Fitur pencarian akan segera tersedia");
          },
        };
      case "leave":
        return {
          icon: "event_add",
          background: "bg-orange",
          label: "New Leave",
          action: () => {
            // Open leave request form
            alert("Fitur permintaan cuti baru akan segera tersedia");
          },
        };
      case "attendance":
        return {
          icon: currentAttendance ? "logout" : "login",
          background: currentAttendance ? "bg-orange" : "bg-teal",
          label: currentAttendance ? "Clock Out" : "Clock In",
          action: () => {
            if (currentAttendance) {
              checkOut(currentAttendance.id);
            } else {
              checkIn();
            }
          },
        };
      case "payslips":
        return {
          icon: "download",
          background: "bg-teal",
          label: "Download",
          action: () => {
            // Open download payslip action
            alert("Fitur download slip gaji akan segera tersedia");
          },
        };
      case "profile":
        return {
          icon: "edit",
          background: "bg-teal",
          label: "Edit Profile",
          action: () => {
            // Open edit profile action
            alert("Fitur edit profil akan segera tersedia");
          },
        };
      default:
        return {
          icon: "add",
          background: "bg-teal",
          label: "Action",
          action: () => {
            alert("Aksi tidak tersedia");
          },
        };
    }
  };

  const config = getActionConfig(currentPage);

  const handleClick = () => {
    setIsPressed(true);
    config.action();
    setTimeout(() => setIsPressed(false), 300);
  };

  // Tidak menampilkan tombol action di semua halaman
  return null;
}
