import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { NeumorphicCard, NeumorphicButton } from "@/components/ui/neumorphic";
import {
  formatFullDate,
  formatTime,
  calculateDuration,
  formatDate,
  convertUTCtoJakartaTime,
} from "@/lib/utils";
import {
  useAttendance,
  useAttendanceHistory,
  useCheckInOut,
  useWeeklyAttendance,
} from "@/hooks/useOdoo";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Attendance() {
  const { data: currentAttendance, isLoading: isAttendanceLoading } =
    useAttendance();
  const { data: attendanceHistory, isLoading: isHistoryLoading } =
    useAttendanceHistory();
  const { data: weeklyData, isLoading: isWeeklyLoading } =
    useWeeklyAttendance();
  const {
    checkIn,
    checkOut,
    checkInError,
    checkOutError,
    isCheckingIn,
    isCheckingOut,
  } = useCheckInOut();
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Set current date
    setCurrentDate(formatFullDate(new Date()));

    // Update time every second
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(formatTime(now));

      // Kalkulasi elapsed time berdasarkan status attendance
      if (currentAttendance) {
        // Untuk clock-in hari ini yang masih aktif (belum clock-out)
        if (currentAttendance.status === "active") {
          // Pendekatan paling sederhana untuk menghitung durasi
          // Timer dari waktu nyata di server Odoo
          
          // 1. Parse string waktu dari API
          const now = new Date();
          const checkInTime = new Date(currentAttendance.check_in);
          
          // 2. Hitung selisih waktu dari sejak clock in sampai sekarang
          const diffMs = now.getTime() - checkInTime.getTime();
          
          // 3. Konversi milidetik ke format jam:menit dan kurangi 7 jam
          const totalSeconds = Math.floor(diffMs / 1000);
          let hours = Math.floor(totalSeconds / 3600);
          // Kurangi 7 jam dari tampilan untuk kompensasi perbedaan timezone
          hours = hours >= 7 ? hours - 7 : hours; // Pastikan tidak negative
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          
          // 4. Format untuk tampilan timer (00:00)
          setElapsedTime(
            `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
          );
          
          // 5. Log debugging tetapi hanya setiap 10 detik
          if (seconds % 10 === 0) {
            console.log(`------ TIMER DEBUG INFO ------`);
            console.log(`Check in time: ${currentAttendance.check_in}`);
            console.log(`Server time now: ${now.toISOString()}`);
            console.log(`Time diff (ms): ${diffMs}`);
            console.log(`Elapsed time: ${hours}h ${minutes}m ${seconds}s`);
            console.log(`--------------------------`);
          }
        }
        // Untuk clock-in yang sudah clock-out
        else {
          // Jika sudah check out di hari ini, tunjukkan waktu hari ini
          // Reset timer jika ada clock out hari ini
          if (currentAttendance.check_out) {
            const checkInTime = new Date(currentAttendance.check_in);
            const checkOutTime = new Date(currentAttendance.check_out);

            // Pastikan keduanya ada dan ini adalah data dari clock in & out hari ini
            if (checkInTime && checkOutTime) {
              const diffMs = checkOutTime.getTime() - checkInTime.getTime();
              let hours = Math.floor(diffMs / (1000 * 60 * 60));
              // Kurangi 7 jam dari tampilan untuk kompensasi perbedaan timezone
              hours = hours >= 7 ? hours - 7 : hours; // Pastikan tidak negative
              const minutes = Math.floor(
                (diffMs % (1000 * 60 * 60)) / (1000 * 60),
              );
              setElapsedTime(
                `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
              );
            } else {
              // Jika tidak ada data clock in/out hari ini
              setElapsedTime("00:00");
            }
          } else {
            // Jika tidak ada check_out data, reset timer
            setElapsedTime("00:00");
          }
        }
      } else {
        // Jika tidak ada attendance data sama sekali, reset timer
        setElapsedTime("00:00");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentAttendance]);

  // Menangani error saat check in
  useEffect(() => {
    if (checkInError) {
      const errorMsg = checkInError.message || "Failed to check in";
      setErrorMessage(errorMsg);
      toast({
        title: "Clock In Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }, [checkInError, toast]);

  // Menangani error saat check out
  useEffect(() => {
    if (checkOutError) {
      const errorMsg = checkOutError.message || "Failed to check out";
      setErrorMessage(errorMsg);
      toast({
        title: "Clock Out Failed",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }, [checkOutError, toast]);

  // Cek apakah sudah check in dan check out hari ini
  const isCompletedToday = useMemo(() => {
    // Jika status null, berarti ini attendance dari hari sebelumnya yang sudah check out
    // dan kita masih memperbolehkan user untuk check in lagi di hari ini
    if (!currentAttendance || currentAttendance.status === null) {
      return false;
    }

    return currentAttendance.status === "completed";
  }, [currentAttendance]);

  const handleAttendanceAction = async () => {
    try {
      if (currentAttendance && currentAttendance.status === "active") {
        // Check out (hanya jika ada attendance yang aktif)
        checkOut(currentAttendance.id);

        // Bersihkan error sebelumnya jika sukses
        setErrorMessage(null);

        // Notifikasi sukses
        toast({
          title: "Clock Out Success",
          description: "You have successfully clocked out.",
          variant: "default",
        });
      } else if (!isCompletedToday) {
        // Check in (hanya jika belum ada attendance yang selesai hari ini)
        checkIn();

        // Bersihkan error sebelumnya jika sukses
        setErrorMessage(null);

        // Notifikasi sukses
        toast({
          title: "Clock In Success",
          description: "You have successfully clocked in.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Attendance action failed:", error);
      // Error sudah ditangani oleh useEffect untuk checkInError dan checkOutError
    }
  };

  // Sample data for weekly summary chart
  const weekDays = [
    { day: "Mon", height: "40%" },
    { day: "Tue", height: "80%" },
    { day: "Wed", height: "70%" },
    { day: "Thu", height: "90%" },
    { day: "Fri", height: "60%" },
    { day: "Sat", height: "10%", inactive: true },
    { day: "Sun", height: "10%", inactive: true },
  ];

  // Show loading skeleton if data is loading
  if (isAttendanceLoading && isHistoryLoading) {
    return <PageSkeleton />;
  }

  // Show error message if data failed to load
  if (!attendanceHistory && !isHistoryLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 min-h-[50vh]">
        <div className="text-red-500 mb-4 text-4xl">!</div>
        <h3 className="text-lg font-semibold mb-2">
          Failed to load attendance data
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

  return (
    <div className="px-5 pb-safe">
      {/* Today's Attendance */}
      <div className="mt-4 mb-6">
        <NeumorphicCard className="p-5 text-center border-t-4 border-teal">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-navy font-semibold text-lg">
              Today's Attendance
            </h3>
            <span className="text-teal-600 text-xs px-3 py-1 rounded-full bg-teal-50 border border-teal-100">
              {currentDate}
            </span>
          </div>

          <div className="relative mx-auto w-48 h-48 mb-6">
            <div className="absolute inset-0 rounded-full shadow-inner bg-gradient-to-br from-teal-50 to-slate-50 flex items-center justify-center">
              <div className="absolute inset-1 rounded-full border border-teal/10 bg-white flex items-center justify-center">
                <div className="text-center">
                  <div className="text-sm text-teal mb-1">Hours Today</div>
                  <p className="text-navy text-3xl font-semibold">
                    {elapsedTime}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="p-4 rounded-xl bg-slate-50">
              <div className="flex items-center mb-2">
                <span className="material-icons-round text-teal mr-1 text-sm">
                  login
                </span>
                <p className="text-slate-light text-xs">Clock In</p>
              </div>
              <p className="text-navy font-medium text-lg">
                {currentDate.includes(formatDate(new Date()).split(",")[0])
                  ? currentAttendance && currentAttendance.check_in
                    ? formatTime(currentAttendance.check_in)
                    : "--:--"
                  : "--:--"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50">
              <div className="flex items-center mb-2">
                <span className="material-icons-round text-teal mr-1 text-sm">
                  logout
                </span>
                <p className="text-slate-light text-xs">Clock Out</p>
              </div>
              <p className="text-navy font-medium text-lg">
                {currentDate.includes(formatDate(new Date()).split(",")[0])
                  ? currentAttendance
                    ? currentAttendance.status === "active"
                      ? "Pending..."
                      : formatTime(currentAttendance.check_out)
                    : "--:--"
                  : "--:--"}
              </p>
            </div>
          </div>

          {/* Jika ada error, tampilkan pesan error */}
          {errorMessage && (
            <div className="mb-4 px-4 py-2 bg-red-50 text-red-600 rounded-md text-sm text-center">
              {errorMessage}
            </div>
          )}

          <NeumorphicButton
            className={`font-medium rounded-xl py-3 px-8 shadow-lg w-full mx-auto
              ${
                isCompletedToday
                  ? "bg-gray-200 text-gray-600 border border-gray-300"
                  : "bg-teal text-white"
              }`}
            onClick={handleAttendanceAction}
            disabled={isCheckingIn || isCheckingOut || isCompletedToday}
          >
            {isCheckingIn || isCheckingOut ? (
              <div className="flex items-center justify-center space-x-1">
                <div className="loading-wave bg-white"></div>
                <div className="loading-wave bg-white"></div>
                <div className="loading-wave bg-white"></div>
              </div>
            ) : isCompletedToday ? (
              <div className="flex items-center justify-center">
                <span className="material-icons-round text-base mr-1">
                  check_circle
                </span>
                Completed
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="material-icons-round text-base mr-1">
                  {currentAttendance && currentAttendance.status === "active"
                    ? "logout"
                    : "login"}
                </span>
                <span className="text-white">
                  {currentAttendance && currentAttendance.status === "active"
                    ? "Clock Out"
                    : "Clock In"}
                </span>
              </div>
            )}
          </NeumorphicButton>
        </NeumorphicCard>
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
          ) : weeklyData ? (
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

      {/* Recent Records */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Recent Records</h3>
          <Link
            to="/attendance-history"
            className="text-teal text-sm font-medium flex items-center"
          >
            <span>View all</span>
            <span className="material-icons-round text-base ml-1">
              arrow_forward
            </span>
          </Link>
        </div>

        {isHistoryLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : attendanceHistory && attendanceHistory.length > 0 ? (
          attendanceHistory.map((record: any, index: number) => (
            <NeumorphicCard
              key={index}
              className="p-4 mb-4 border-r-4 border-teal"
            >
              <div>
                <div className="flex items-center mb-1">
                  <span className="material-icons-round text-teal mr-2 text-sm">
                    event
                  </span>
                  <h4 className="text-navy font-medium">
                    {formatFullDate(record.check_in).split(",")[0]}{" "}
                    {/* Just the day part */}
                  </h4>
                </div>
                <div className="flex items-center mt-1 bg-slate-50 px-3 py-1 rounded-full">
                  <span className="text-slate text-sm flex items-center">
                    <span className="material-icons-round text-teal mr-1 text-xs">
                      schedule
                    </span>
                    {formatTime(record.check_in)} -{" "}
                    {formatTime(record.check_out)}
                  </span>
                  <span className="mx-2 text-slate-light">•</span>
                  <span className="text-teal text-sm font-medium flex items-center">
                    <span className="material-icons-round text-teal mr-1 text-xs">
                      timer
                    </span>
                    {record.worked_hours
                      ? `${Number(record.worked_hours).toFixed(2)}h`
                      : calculateDuration(
                          new Date(record.check_in),
                          new Date(record.check_out),
                        )}
                  </span>
                </div>
              </div>
            </NeumorphicCard>
          ))
        ) : (
          <NeumorphicCard className="mb-4 p-8 text-center">
            <div className="flex flex-col items-center">
              <span className="material-icons-round text-3xl text-slate-300 mb-2">
                event_busy
              </span>
              <p className="text-slate">No attendance records found</p>
              <p className="text-slate-400 text-sm mt-1">
                Your attendance history will appear here
              </p>
            </div>
          </NeumorphicCard>
        )}
      </div>
    </div>
  );
}
