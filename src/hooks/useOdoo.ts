import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import odooClient from "@/lib/odooApi";

// Authentication hook
export function useOdooAuth() {
  const queryClient = useQueryClient();

  // Add a loading state query to check authentication status
  const { isLoading: isAuthLoading } = useQuery({
    queryKey: ["auth", "status"],
    queryFn: async () => {
      return odooClient.isAuthenticated();
    },
    staleTime: 60 * 1000, // 1 minute
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: {
      username: string;
      password: string;
      db?: string;
    }) => {
      try {
        console.log("Attempting login with credentials:", {
          username: credentials.username,
          db: credentials.db,
        });
        const result = await odooClient.login(credentials);
        console.log("Login result:", result);
        return result;
      } catch (error) {
        console.error("Login error in hook:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate user data queries after successful login
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => {
      odooClient.logout();
      return Promise.resolve();
    },
    onSuccess: () => {
      // Reset cache after logout
      queryClient.clear();
      // Redirect to auth page after logout
      window.location.href = '/auth';
    },
  });

  return {
    login: (
      credentials: { username: string; password: string; db?: string },
      options?: { onSuccess?: () => void; onError?: (error: any) => void },
    ) => {
      return loginMutation.mutate(credentials, {
        onSuccess: () => {
          console.log("Login successful in hook");
          options?.onSuccess?.();
        },
        onError: (error) => {
          console.error("Login error in hook callback:", error);
          options?.onError?.(error);
        },
      });
    },
    logout: logoutMutation.mutate,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    isLoading:
      isAuthLoading || loginMutation.isPending || logoutMutation.isPending,
    isAuthenticated: odooClient.isAuthenticated(),
    session: odooClient.getSession(),
  };
}

// Profile data hook
export function useUserProfile() {
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      if (!odooClient.isAuthenticated()) {
        console.log("Not authenticated, cannot fetch profile");
        return null;
      }

      const session = odooClient.getSession();
      if (!session) {
        console.log("No session found, cannot fetch profile");
        return null;
      }

      try {
        console.log("Fetching profile for uid:", session.uid);

        // First try with hr.employee.public
        const publicProfile = await odooClient.searchRead({
          model: "hr.employee.public",
          domain: [["user_id", "=", session.uid]],
          fields: [
            "name",
            "job_title",
            "department_id",
            "work_email",
            "mobile_phone",
            "work_phone",
            "registration_number",
            "image_128",
          ],
        });

        if (publicProfile && publicProfile.length > 0) {
          return publicProfile[0];
        }

        // Fallback to hr.employee
        console.log("No profile found in hr.employee.public, trying hr.employee");
        const fallbackProfile = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", session.uid]],
          fields: [
            "name",
            "job_title",
            "department_id",
            "work_email",
            "mobile_phone",
            "work_phone",
            "image_128",
            "registration_number",
          ],
        });

        return fallbackProfile && fallbackProfile.length > 0 ? fallbackProfile[0] : null;
      } catch (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
    },
    enabled: odooClient.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // Cache profile data for 5 minutes
  });
}

// Leave Management hooks
export function useLeaveBalance() {
  return useQuery({
    queryKey: ["leaves", "balance"],
    queryFn: async () => {
      const data = await odooClient.call({
        model: "hr.leave.type",
        method: "get_days_all_request",
        args: [],
        kwargs: {}
      });
      return data;
    },
    enabled: odooClient.isAuthenticated(),
  });
}

export function useLeaveRequests(status?: string, limit = 5) {
  let domain: any[] = [];

  if (status && status !== "all") {
    domain = [["state", "=", status]];
  }

  return useQuery({
    queryKey: ["leaves", "requests", status, limit],
    queryFn: async () => {
      console.log("Fetching leave requests with status:", status, "and limit:", limit);
      const session = odooClient.getSession();
      if (!session) return [];

      try {
        const finalDomain = [
          ["employee_id.user_id", "=", session.uid],
          ...domain,
        ];
        console.log("Leave request domain:", finalDomain);

        const leaveRequests = await odooClient.searchRead({
          model: "hr.leave",
          domain: finalDomain,
          fields: [
            "name",
            "holiday_status_id",
            "date_from",
            "date_to",
            "number_of_days",
            "state",
            "holiday_type",
          ],
          limit: limit,
          order: "date_from desc",
        });

        return leaveRequests || [];
      } catch (error) {
        console.error("Error fetching leave requests:", error);
        return [];
      }
    },
    enabled: odooClient.isAuthenticated(),
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leaveData: {
      holiday_allocation_id: boolean;
      state: string;
      holiday_type: string;
      holiday_status_id: number;
      date_from: string;
      date_to: string;
      name: string;
      request_date_from: string;
      request_date_to: string;
      request_hour_from?: boolean;
      request_hour_to?: boolean;
      request_unit_half?: boolean;
      request_date_from_period?: string;
      request_unit_hours?: boolean;
    }) => {
      try {
        const session = odooClient.getSession();
        if (!session) throw new Error("Tidak ada sesi yang aktif");

        const employee = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", session.uid]],
          fields: ["id"],
        });

        if (!employee.length) throw new Error("Data karyawan tidak ditemukan");

        const completeLeaveData = {
          ...leaveData,
          employee_id: employee[0].id,
        };

        console.log("Submitting leave request:", completeLeaveData);

        const result = await odooClient.call({
          model: "hr.leave",
          method: "create",
          args: [completeLeaveData],
          kwargs: {} // Add empty kwargs to match expected format
        });

        return result;
      } catch (error) {
        console.error("Error creating leave request:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave", "balance"] });
      queryClient.invalidateQueries({ queryKey: ["leave", "requests"] });
    },
  });
}

// Attendance hooks
export function useAttendance() {
  return useQuery({
    queryKey: ["attendance", "current"],
    queryFn: async () => {
      try {
        const session = odooClient.getSession();
        if (!session) return null;

        // Get current user's employee id
        const employee = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", session.uid]],
          fields: ["id"],
        });

        if (!employee.length) return null;

        // Check if user is currently checked in
        const activeAttendance = await odooClient.searchRead({
          model: "hr.attendance",
          domain: [
            ["employee_id", "=", employee[0].id],
            ["check_out", "=", false],
          ],
          fields: ["id", "check_in", "worked_hours"],
          limit: 1,
        });

        // Jika ada active attendance, return itu
        if (activeAttendance.length) {
          return {
            ...activeAttendance[0],
            status: "active",
          };
        }

        // Dapatkan tanggal hari ini dalam UTC+7
        const now = new Date();
        const nowUTC7 = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        const todayStr = nowUTC7.toISOString().split("T")[0]; // Format: YYYY-MM-DD

        // Set start dan end time untuk hari ini dalam UTC+7
        const todayStart = new Date(nowUTC7);
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayStartUTC = new Date(todayStart.getTime() - (7 * 60 * 60 * 1000));
        const todayStartStr = todayStartUTC.toISOString().replace('T', ' ').split('.')[0];

        const todayEnd = new Date(nowUTC7);
        todayEnd.setUTCHours(23, 59, 59, 999);
        const todayEndUTC = new Date(todayEnd.getTime() - (7 * 60 * 60 * 1000));
        const todayEndStr = todayEndUTC.toISOString().replace('T', ' ').split('.')[0];

        console.log("Searching for today records:", {
          nowUTC7: nowUTC7.toISOString(),
          todayStr,
          todayStartStr,
          todayEndStr
        });

        // Menggunakan searchRead langsung untuk mencari attendance hari ini
        const todayAttendance = await odooClient.searchRead({
          model: "hr.attendance",
          domain: [
            ["employee_id", "=", employee[0].id],
            ["check_in", ">=", todayStartStr],
            ["check_in", "<=", todayEndStr],
          ],
          fields: ["id", "check_in", "check_out", "worked_hours"],
          limit: 10,
          order: "check_in desc",
        });

        console.log("Today attendance records:", todayAttendance);

        // Cek attendance terbaru hari ini (jika ada)
        if (todayAttendance && todayAttendance.length > 0) {
          // Jika attendance terakhir sudah check_out, kita tampilkan data tersebut
          if (todayAttendance[0].check_out) {
            const checkOutDate = new Date(todayAttendance[0].check_out);
            // Konversi ke UTC+7
            const checkOutUTC7 = new Date(checkOutDate.getTime() + (7 * 60 * 60 * 1000));
            const checkOutDateStr = checkOutUTC7.toISOString().split('T')[0];

            // Debug untuk melihat perbandingan tanggal
            console.log("Date comparison for attendance:", {
              today: todayStr,
              checkOutDate: checkOutDateStr,
              isSameDay: todayStr === checkOutDateStr,
              recordData: todayAttendance[0],
            });

            // Jika check out dari record terakhir masih di hari yang sama dengan hari ini,
            // set status completed. Jika berbeda hari, set null agar bisa check in lagi
            const status = todayStr === checkOutDateStr ? "completed" : null;

            console.log("Returning attendance with status:", status);

            return {
              ...todayAttendance[0],
              status,
            };
          }
        }

        // Jika tidak ada attendance hari ini atau attendance terakhir memiliki tanggal yang berbeda,
        // kembalikan null agar user bisa check in
        return null;
      } catch (error) {
        console.error("Failed to fetch attendance data:", error);
        return null;
      }
    },
    enabled: odooClient.isAuthenticated(),
    refetchInterval: 60000, // Refresh every minute to update worked hours
  });
}

export function useAttendanceHistory(limit = 5) {
  return useQuery({
    queryKey: ["attendance", "history", limit],
    queryFn: async () => {
      try {
        // Get session and employee data
        const session = odooClient.getSession();
        if (!session) return [];

        const employee = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", session.uid]],
          fields: ["id"],
        });

        if (!employee.length) return [];

        // Menggunakan odooClient.call yang telah dikonfirmasi berfungsi dari curl test
        const result = await odooClient.call({
          model: "hr.attendance",
          method: "search_read",
          args: [
            [
              ["employee_id", "=", employee[0].id],
              ["check_out", "!=", false],
            ],
          ],
          kwargs: {
            fields: ["check_in", "check_out", "worked_hours"],
            limit: limit,
            order: "check_in desc",
          },
        });

        // Log hasil untuk debugging
        console.log("Attendance history data:", result);

        return result || [];
      } catch (error) {
        console.error("Failed to fetch attendance history:", error);
        return [];
      }
    },
    enabled: odooClient.isAuthenticated(),
    staleTime: 60000, // Cache data for 1 minute
  });
}

export function useWeeklyAttendance() {
  return useQuery({
    queryKey: ["attendance", "weekly"],
    queryFn: async () => {
      try {
        const session = odooClient.getSession();
        if (!session) return null;

        const employee = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", session.uid]],
          fields: ["id"],
        });

        if (!employee.length) return null;

        // Get current date in UTC+7
        const now = new Date();
        const nowInUTC7 = new Date(now.getTime() + (7 * 60 * 60 * 1000));
        
        const dayOfWeek = nowInUTC7.getUTCDay();
        const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const startOfWeek = new Date(nowInUTC7);
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - daysUntilMonday);
        startOfWeek.setUTCHours(0, 0, 0, 0);
        const startOfWeekUTC = new Date(startOfWeek.getTime() - (7 * 60 * 60 * 1000));
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 4);
        endOfWeek.setUTCHours(23, 59, 59, 999);
        const endOfWeekUTC = new Date(endOfWeek.getTime() - (7 * 60 * 60 * 1000));

        const startDateStr = startOfWeekUTC.toISOString().replace("T", " ").split(".")[0];
        const endDateStr = endOfWeekUTC.toISOString().replace("T", " ").split(".")[0];

        const attendanceRecords = await odooClient.searchRead({
          model: "hr.attendance",
          domain: [
            ["employee_id", "=", employee[0].id],
            "|",
            "&",
            ["check_in", ">=", startDateStr],
            ["check_in", "<=", endDateStr],
            "&",
            ["check_out", ">=", startDateStr],
            ["check_out", "<=", endDateStr]
          ],
          fields: ["check_in", "check_out", "worked_hours"],
          order: "check_in desc",
        });

        // Initialize daily hours
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri"];
        const dailyHours = days.map((day, index) => ({
          day: dayShort[index],
          fullDay: day,
          hours: 0,
          inactive: false,
          percent: 0,
        }));

        // Process each attendance record
        const records = attendanceRecords || [];
        records.forEach((record: any) => {
          const checkIn = new Date(record.check_in.replace(" ", "T") + "Z");
          // Add 7 hours to convert to UTC+7
          const checkInUTC7 = new Date(checkIn.getTime() + (7 * 60 * 60 * 1000));
          const dayIndex = (checkInUTC7.getUTCDay() + 6) % 7; // Convert to 0 = Monday
          
          if (dayIndex < 5) { // Only process Monday-Friday
            dailyHours[dayIndex].hours += record.worked_hours || 0;
            
            console.log(`Adding hours for ${days[dayIndex]}:`, {
              checkIn: checkIn.toISOString(),
              checkInUTC7: checkInUTC7.toISOString(),
              dayIndex,
              worked_hours: record.worked_hours,
              currentTotal: dailyHours[dayIndex].hours
            });
          }
        });

        // Calculate percentages and round hours
        const totalWorkedHours = dailyHours.reduce((sum, day) => sum + day.hours, 0);
        // Find the highest hours in the week
        const maxHours = Math.max(...dailyHours.map(day => day.hours));
        
        dailyHours.forEach(day => {
          // Calculate percentage based on the highest hours in the week
          // If maxHours is 0, set percent to 0 to avoid division by zero
          day.percent = maxHours > 0 ? (day.hours / maxHours) * 100 : 0;
          day.hours = Math.round(day.hours * 100) / 100; // Round to 2 decimal places
        });

        console.log("Final daily hours:", dailyHours);
        console.log("Total worked hours this week:", totalWorkedHours);
        console.log("Max hours in a day:", maxHours);

        return {
          startDate: startOfWeek,
          endDate: endOfWeek,
          dailyHours,
          totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
          standardHours: 40,
        };
      } catch (error) {
        console.error("Error in useWeeklyAttendance:", error);
        return null;
      }
    },
    enabled: odooClient.isAuthenticated(),
  });
}

export function useCheckInOut() {
  const queryClient = useQueryClient();

  const formatDateTime = (date: Date) => {
    return date.toISOString().replace("T", " ").split(".")[0];
  };

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const session = odooClient.getSession();
      if (!session) throw new Error("Not authenticated");

      const currentAttendance = await odooClient.searchRead({
        model: "hr.attendance",
        domain: [
          ["employee_id.user_id", "=", session.uid],
          ["check_out", "=", false],
        ],
        fields: ["id", "check_in"],
        limit: 1,
      });

      if (currentAttendance.length > 0) {
        throw new Error("You already have an active attendance record. Please check out first.");
      }

      const employee = await odooClient.searchRead({
        model: "hr.employee",
        domain: [["user_id", "=", session.uid]],
        fields: ["id"],
      });

      if (!employee.length) throw new Error("Employee not found");

      const result = await odooClient.call({
        model: "hr.attendance",
        method: "create",
        args: [{
          employee_id: employee[0].id,
          check_in: formatDateTime(new Date()),
        }],
        kwargs: {} // Add empty kwargs to match expected format
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async (attendanceId: number) => {
      try {
        const session = odooClient.getSession();
        if (!session) throw new Error("Not authenticated");

        const result = await odooClient.call({
          model: "hr.attendance",
          method: "write",
          args: [[attendanceId], { check_out: formatDateTime(new Date()) }],
          kwargs: {} // Add empty kwargs to match expected format
        });

        return result;
      } catch (error: any) {
        console.error("Check out error:", error);
        if (error?.message?.includes("ValidationError")) {
          throw new Error("Cannot check out: Check out time must be after check in time");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });

  return {
    checkIn: checkInMutation.mutate,
    checkOut: checkOutMutation.mutate,
    checkInError: checkInMutation.error,
    checkOutError: checkOutMutation.error,
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
  };
}

// Payslips hooks
export function usePayslips(limit = 5) {
  return useQuery({
    queryKey: ["payslips", limit],
    queryFn: async () => {
      const session = odooClient.getSession();
      if (!session) return [];

      const payslips = await odooClient.searchRead({
        model: "hr.payslip",
        domain: [["employee_id.user_id", "=", session.uid]],
        fields: [
          "name",
          "date_from",
          "date_to",
          "state",
          "number",
          "net_wage",
          "line_ids",
          "company_id",
        ],
        limit,
        order: "date_from desc",
      });

      return payslips;
    },
    enabled: odooClient.isAuthenticated(),
  });
}

export function usePayslipDetails(payslipId: number) {
  return useQuery({
    queryKey: ["payslips", "details", payslipId],
    queryFn: async () => {
      if (!payslipId) return null;

      const details = await odooClient.searchRead({
        model: "hr.payslip.line",
        domain: [["slip_id", "=", payslipId]],
        fields: [
          "name",
          "code",
          "category_id",
          "quantity",
          "rate",
          "amount",
          "total",
        ],
      });

      return details;
    },
    enabled: !!payslipId && odooClient.isAuthenticated(),
  });
}

export function usePayslipById(payslipId: number) {
  return useQuery({
    queryKey: ["payslip", payslipId],
    queryFn: async () => {
      if (!payslipId) return null;

      const payslip = await odooClient.searchRead({
        model: "hr.payslip",
        domain: [["id", "=", payslipId]],
        fields: [
          "name",
          "employee_id",
          "date_from",
          "date_to",
          "state",
          "number",
          "net_wage",
          "company_id"
        ],
      });

      return payslip.length > 0 ? payslip[0] : null;
    },
    enabled: !!payslipId && odooClient.isAuthenticated(),
  });
}

// Company data hook (untuk mendapatkan informasi perusahaan)
export function useCompanyData() {
  return useQuery({
    queryKey: ["company", "details"],
    queryFn: async () => {
      const session = odooClient.getSession();
      if (!session) return null;

      try {
        // Cari company ID yang terkait dengan user
        const employee = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", session.uid]],
          fields: ["company_id"],
          limit: 1,
        });

        if (!employee.length || !employee[0].company_id) {
          // Jika tidak ada employee atau tidak ada company_id, ambil company utama
          const mainCompany = await odooClient.searchRead({
            model: "res.company",
            domain: [],
            fields: ["name", "street", "street2", "city", "zip", "country_id", "state_id", "email", "phone", "logo"],
            limit: 1,
          });
          
          return mainCompany.length ? mainCompany[0] : null;
        }

        // Ambil detail company berdasarkan company_id dari employee
        const companyId = employee[0].company_id[0];
        const companyDetails = await odooClient.searchRead({
          model: "res.company",
          domain: [["id", "=", companyId]],
          fields: ["name", "street", "street2", "city", "zip", "country_id", "state_id", "email", "phone", "logo"],
        });

        return companyDetails.length ? companyDetails[0] : null;
      } catch (error) {
        console.error("Error fetching company data:", error);
        return null;
      }
    },
    enabled: odooClient.isAuthenticated(),
    staleTime: 60 * 60 * 1000, // Cache company data for 1 hour
  });
}

// Company announcements
export function useCompanyAnnouncements(limit = 5) {
  return useQuery({
    queryKey: ["announcements", limit],
    queryFn: async () => {
      // Pertama, cari ID channel pengumuman
      const channels = await odooClient.searchRead({
        model: "mail.channel",
        domain: [
          ["name", "like", "Pengumuman"]
        ],
        fields: ["id", "name"],
        limit: 1
      });
      
      const channelId = channels && channels.length > 0 ? channels[0].id : false;
      
      // Jika channel ditemukan, cari pesan di channel tersebut
      if (channelId) {
        const announcements = await odooClient.searchRead({
          model: "mail.message",
          domain: [
            ["model", "=", "mail.channel"],
            ["res_id", "=", channelId],
            ["message_type", "in", ["notification", "comment"]]
          ],
          fields: ["body", "date", "author_id", "tracking_value_ids", "subtype_id"],
          limit,
          order: "date desc",
        });
        
        // Ubah struktur data untuk menyesuaikan dengan template yang ada
        // Karena tidak ada subject, kita gunakan nama author + tanggal sebagai "subject"
        return announcements.map((announcement: any) => {
          const authorName = announcement.author_id ? announcement.author_id[1] : "System";
          const messageDate = new Date(announcement.date).toLocaleDateString();
          
          // Buat subject dari kombinasi author dan tanggal
          return {
            ...announcement,
            subject: `${authorName} - ${messageDate}`
          };
        });
      }
      
      // Fallback ke pencarian pengumuman di seluruh channel jika channel pengumuman tidak ditemukan
      const announcements = await odooClient.searchRead({
        model: "mail.message",
        domain: [
          ["model", "=", "mail.channel"],
          ["message_type", "=", "notification"]
        ],
        fields: ["body", "date", "author_id", "tracking_value_ids", "subtype_id"],
        limit,
        order: "date desc",
      });

      // Ubah struktur data untuk menyesuaikan dengan template yang ada
      return announcements.map((announcement: any) => {
        const authorName = announcement.author_id ? announcement.author_id[1] : "System";
        const messageDate = new Date(announcement.date).toLocaleDateString();
        
        // Buat subject dari kombinasi author dan tanggal
        return {
          ...announcement,
          subject: `${authorName} - ${messageDate}`
        };
      });
    },
    enabled: odooClient.isAuthenticated(),
  });
}

// Calendar Events
export function useCalendarEvents(limit = 5) {
  return useQuery({
    queryKey: ["calendar-events", limit],
    queryFn: async () => {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      
      // Get employee ID first
      const employee = await odooClient.searchRead({
        model: "hr.employee",
        domain: [["user_id", "=", odooClient.getSession()?.uid]],
        fields: ["id"],
        limit: 1
      });
      
      if (!employee || employee.length === 0) {
        throw new Error("Employee not found");
      }
      
      // Now fetch calendar events
      const events = await odooClient.searchRead({
        model: "calendar.event",
        domain: [
          ["attendee_ids.partner_id.id", "=", employee[0].id],
          ["start", ">=", formattedDate]
        ],
        fields: ["name", "start", "stop", "allday", "location", "description"],
        limit,
        order: "start asc"
      });
      
      return events;
    },
    enabled: odooClient.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Planning Progress
export function usePlanningProgress(limit = 5) {
  return useQuery({
    queryKey: ["planning-progress", limit],
    queryFn: async () => {
      try {
        // Get employee ID first
        const employee = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", odooClient.getSession()?.uid]],
          fields: ["id"],
          limit: 1
        });
        
        if (!employee || employee.length === 0) {
          throw new Error("Employee not found");
        }
        
        // Get current year for filtering
        const currentYear = new Date().getFullYear();
        const startOfYear = `${currentYear}-01-01`;
        const endOfYear = `${currentYear}-12-31`;
        
        // Now fetch planning progress data for current year only
        const planningData = await odooClient.searchRead({
          model: "operational.planning.table",
          domain: [
            ["employee_id", "=", employee[0].id],
            ["start_date", ">=", startOfYear],
            ["start_date", "<=", endOfYear]
          ],
          fields: [
            "name", 
            "employee_id", 
            "department_id", 
            "start_date", 
            "end_date", 
            "target_points", 
            "planned_points", 
            "achieve_points"
          ],
          limit,
          order: "start_date desc"
        });
        
        // Process data to add percentage calculation
        return planningData.map((item: any) => ({
          ...item,
          percentAchieved: item.target_points 
            ? Math.round((item.achieve_points / item.target_points) * 100)
            : 0,
          // Add color based on progress percentage
          statusColor: getProgressColor(
            item.target_points 
              ? Math.round((item.achieve_points / item.target_points) * 100)
              : 0
          )
        }));
      } catch (error) {
        console.error("Error fetching planning progress:", error);
        return [];
      }
    },
    enabled: odooClient.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Project Updates
export function useProjectUpdates(month?: number, year?: number) {
  const currentDate = new Date();
  const selectedMonth = month !== undefined ? month : currentDate.getMonth();
  const selectedYear = year !== undefined ? year : currentDate.getFullYear();
  
  // Buat start date dan end date dari bulan dan tahun yang dipilih
  const startDate = new Date(selectedYear, selectedMonth, 1);
  const endDate = new Date(selectedYear, selectedMonth + 1, 0);
  
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  // Hitung tanggal 6 bulan yang lalu untuk data tren
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(currentDate.getMonth() - 5);
  const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ["project-updates", selectedMonth, selectedYear],
    queryFn: async () => {
      try {
        // Gunakan odooClient seperti pada hooks lainnya
        // Dapatkan employee ID terlebih dahulu
        const employee = await odooClient.searchRead({
          model: "hr.employee",
          domain: [["user_id", "=", odooClient.getSession()?.uid]],
          fields: ["id"],
          limit: 1
        });
        
        if (!employee || employee.length === 0) {
          throw new Error("Employee not found");
        }
        
        // Ambil data planning untuk bulan yang dipilih
        const planningData = await odooClient.searchRead({
          model: "operational.planning.table",
          domain: [
            ["employee_id", "=", employee[0].id],
            ["start_date", ">=", startDateStr],
            ["start_date", "<=", endDateStr]
          ],
          fields: [
            "id",
            "name",
            "department_id",
            "start_date",
            "end_date",
            "target_points",
            "planned_points",
            "achieve_points",
            "achieve_percentage",
            "planned_percentage",
            "line_ids",
            "slot_line_ids"
          ]
        });
        
        // Ambil data tren untuk 6 bulan terakhir
        const trendData = await odooClient.searchRead({
          model: "operational.planning.table",
          domain: [
            ["employee_id", "=", employee[0].id],
            ["start_date", ">=", sixMonthsAgoStr],
            ["start_date", "<=", endDateStr]
          ],
          fields: [
            "id",
            "name",
            "start_date",
            "end_date",
            "target_points",
            "achieve_points",
            "achieve_percentage"
          ],
          order: "start_date asc"
        });
        
        // Ambil data slot lines jika ada data planning
        let slotLinesData = [];
        if (planningData.length > 0) {
          const planningWithSlotLines = planningData.filter((plan: any) => 
            plan.slot_line_ids && plan.slot_line_ids.length > 0);
          
          if (planningWithSlotLines.length > 0) {
            // Dapatkan semua ID slot line yang ada
            const slotLineIds = planningWithSlotLines.flatMap((plan: any) => plan.slot_line_ids);
            console.log("Found slot_line_ids:", slotLineIds);
            
            if (slotLineIds.length > 0) {
              try {
                slotLinesData = await odooClient.searchRead({
                  model: "planning.slot.line",
                  domain: [["id", "in", slotLineIds]],
                  fields: ["id", "project_id", "name", "period", "planned_points"]
                });
                console.log("Retrieved slotLinesData:", slotLinesData);
              } catch (error) {
                console.error("Error fetching slot line data:", error);
              }
            }
          }
        }
        
        // Ambil data update lines jika ada data planning
        let updateLinesData = [];
        if (planningData.length > 0) {
          const planningWithUpdateLines = planningData.filter((plan: any) => 
            plan.line_ids && plan.line_ids.length > 0);
          
          if (planningWithUpdateLines.length > 0) {
            // Dapatkan semua ID update line yang ada
            const updateLineIds = planningWithUpdateLines.flatMap((plan: any) => plan.line_ids);
            console.log("Found line_ids:", updateLineIds);
            
            if (updateLineIds.length > 0) {
              try {
                updateLinesData = await odooClient.searchRead({
                  model: "project.update.line",
                  domain: [["id", "in", updateLineIds]],
                  fields: ["id", "project_id", "name", "previous_progress", "update_progress", "progress_point"]
                });
                console.log("Retrieved updateLinesData:", updateLinesData);
              } catch (error) {
                console.error("Error fetching update line data:", error);
              }
            }
          }
        }
        
        return {
          planningData: planningData.map((plan: any) => ({
            ...plan,
            statusColor: getProgressColor(plan.achieve_percentage || 0),
            planningColor: getPlanningColor(plan.planned_percentage || 0)
          })),
          trendData,
          slotLinesData,
          updateLinesData
        };
      } catch (error) {
        console.error("Error fetching project updates:", error);
        return {
          planningData: [],
          trendData: [],
          slotLinesData: [],
          updateLinesData: []
        };
      }
    },
    enabled: odooClient.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to determine progress bar color based on percentage
function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-500';
  if (percentage >= 75) return 'bg-teal';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

// Helper function to determine planning progress bar color
function getPlanningColor(percentage: number): string {
  if (percentage >= 90) return 'bg-blue-500';
  if (percentage >= 75) return 'bg-blue-400';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

// Expense Types
export interface Expense {
  id: number;
  name: string;
  employee_id: number;
  date: string;
  total_amount: number;
  state: string;
  description?: string;
  product_id?: number;
  unit_amount?: number;
  quantity?: number;
  payment_mode?: string;
  reference?: string;
}

// Expense Hooks
export const useExpenseTypes = () => {
  return useQuery({
    queryKey: ["expenseTypes"],
    queryFn: async () => {
      const session = await odooClient.getSession();
      if (!session) throw new Error("No session found");

      const response = await odooClient.call({
        service: "object",
        method: "execute_kw",
        args: [
          session.db,
          session.uid,
          session.password,
          "hr.expense",
          "search_read",
          [[]],
          {
            fields: ["product_id", "name"],
            limit: 100,
            order: "name asc"
          }
        ],
      });

      // Extract unique product types from the response
      const uniqueProducts = new Map();
      response.forEach((expense: any) => {
        if (expense.product_id && !uniqueProducts.has(expense.product_id[0])) {
          uniqueProducts.set(expense.product_id[0], {
            id: expense.product_id[0],
            name: expense.product_id[1]
          });
        }
      });

      return Array.from(uniqueProducts.values());
    },
  });
};

export const useExpenses = (limit: number = 5) => {
  return useQuery({
    queryKey: ["expenses", limit],
    queryFn: async () => {
      const session = await odooClient.getSession();
      if (!session) throw new Error("No session found");

      const response = await odooClient.call({
        service: "object",
        method: "execute_kw",
        args: [
          session.db,
          session.uid,
          session.password,
          "hr.expense",
          "search_read",
          [[["employee_id.user_id", "=", session.uid]]],
          {
            fields: [
              "name",
              "employee_id",
              "total_amount",
              "date",
              "state",
              "activity_state",
              "currency_id",
              "description",
              "product_id",
              "unit_amount",
              "quantity",
              "payment_mode",
              "reference"
            ],
            limit: limit,
            offset: 0,
            order: "date desc"
          }
        ],
      });

      return response;
    },
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseData: Partial<Expense>) => {
      const session = await odooClient.getSession();
      if (!session) throw new Error("No session found");

      // Get employee ID first
      const employee = await odooClient.searchRead({
        model: "hr.employee",
        domain: [["user_id", "=", session.uid]],
        fields: ["id", "name"],
        limit: 1
      });

      if (!employee.length) throw new Error("Employee not found");

      const completeExpenseData = {
        ...expenseData,
        employee_id: employee[0].id, // Only use the ID
        state: "draft",
        activity_state: "draft",
        currency_id: 12, // IDR currency ID
        date: expenseData.date || new Date().toISOString().split("T")[0],
        total_amount: expenseData.total_amount || 0,
        unit_amount: expenseData.unit_amount || expenseData.total_amount || 0,
        quantity: expenseData.quantity || 1,
        payment_mode: expenseData.payment_mode || "own_account"
      };

      console.log("Creating expense with data:", completeExpenseData);

      const response = await odooClient.call({
        service: "object",
        method: "execute_kw",
        args: [
          session.db,
          session.uid,
          session.password,
          "hr.expense",
          "create",
          [completeExpenseData],
          {} // Add empty kwargs to match expected format
        ],
      });

      return response;
    },
    onSuccess: () => {
      // Invalidate expenses query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    }
  });
};

// Add new hook for expense products
export const useExpenseProducts = () => {
  return useQuery({
    queryKey: ["expenseProducts"],
    queryFn: async () => {
      const session = await odooClient.getSession();
      if (!session) throw new Error("No session found");

      const response = await odooClient.call({
        service: "object",
        method: "execute_kw",
        args: [
          session.db,
          session.uid,
          session.password,
          "product.product",
          "search_read",
          [],
          {
            domain: [
              "&",
              ["can_be_expensed", "=", true],
              "|",
              ["company_id", "=", false],
              ["company_id", "=", 1]
            ],
            fields: [
              "id",
              "name",
              "lst_price",
              "default_code"
            ]
          }
        ],
      });

      return response;
    },
    enabled: odooClient.isAuthenticated(),
  });
};

// Add new hook for expense details
export const useExpenseDetails = (expenseId: number) => {
  return useQuery({
    queryKey: ["expense", "details", expenseId],
    queryFn: async () => {
      if (!expenseId) return null;

      const session = await odooClient.getSession();
      if (!session) throw new Error("No session found");

      // Fetch expense details (fields sama persis dengan useExpenses)
      const expense = await odooClient.searchRead({
        model: "hr.expense",
        domain: [["id", "=", expenseId]],
        fields: [
          "name",
          "employee_id",
          "total_amount",
          "date",
          "state",
          "activity_state",
          "currency_id",
          "description",
          "product_id",
          "unit_amount",
          "quantity",
          "payment_mode",
          "reference",
          "analytic_distribution"
        ],
      });

      if (!expense.length) return null;

      return { expense: expense[0] };
    },
    enabled: !!expenseId && odooClient.isAuthenticated(),
  });
};

// Add new hook for deleting an expense
export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: number) => {
      const session = await odooClient.getSession();
      if (!session) throw new Error("No session found");
      const response = await odooClient.call({
        service: "object",
        method: "execute_kw",
        args: [
          session.db,
          session.uid,
          session.password,
          "hr.expense",
          "unlink",
          [[expenseId]],
          {} // Tambahkan kwargs kosong agar tidak error
        ],
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
  });
};
