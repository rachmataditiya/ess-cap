import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLeaveBalance, useLeaveRequests, useCreateLeaveRequest } from "@/hooks/useOdoo";
import { formatDate } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Import UI components
import { RadialProgress } from "@/components/ui/progress-radial";
import { PageSkeleton } from "@/components/ui/loading-skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Define schema for the form
const leaveFormSchema = z.object({
  holiday_status_id: z.number({
    required_error: "Pilih jenis cuti",
  }),
  name: z.string().min(3, {
    message: "Alasan cuti harus diisi minimal 3 karakter",
  }),
  date_mode: z.enum(["full_day", "half_day"], {
    required_error: "Pilih jenis durasi cuti",
  }),
  date_from: z.date({
    required_error: "Pilih tanggal mulai cuti",
  }),
  date_to: z.date({
    required_error: "Pilih tanggal selesai cuti",
  }),
  request_date_from_period: z.enum(["am", "pm"], {
    required_error: "Pilih periode setengah hari",
  }).optional().nullable(),
});

type LeaveFormValues = z.infer<typeof leaveFormSchema>;

export default function Leave() {
  const [showNewLeaveModal, setShowNewLeaveModal] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<number | null>(null);
  const [annualLeaveId, setAnnualLeaveId] = useState<number | null>(null);
  const { data: leaveBalances, isLoading: isBalanceLoading } = useLeaveBalance();
  const { data: upcomingLeaves, isLoading: isLeavesLoading } = useLeaveRequests('validate');
  const { data: pendingLeaves, isLoading: isPendingLoading } = useLeaveRequests('confirm');
  const createLeaveMutation = useCreateLeaveRequest();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Calculate totals
  const totalLeave = leaveBalances?.reduce((acc, item) => acc + (item.max_leaves || 0), 0) || 0;
  const usedLeave = leaveBalances?.reduce((acc, item) => acc + (item.leaves_taken || 0), 0) || 0;
  const remainingLeave = leaveBalances?.reduce((acc, item) => acc + (item.virtual_remaining_leaves || 0), 0) || 0;
  
  // Calculate percentage for radial progress
  const leavePercentage = totalLeave > 0 ? Math.round((remainingLeave / totalLeave) * 100) : 0;
  const pendingCount = isPendingLoading ? 0 : (pendingLeaves?.length || 0);
  
  // Form handling
  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      holiday_status_id: 0,
      name: "",
      date_mode: "full_day",
      date_from: new Date(),
      date_to: new Date(),
      request_date_from_period: null,
    },
  });

  // Update form when selected leave type changes
  useEffect(() => {
    if (selectedLeaveType) {
      form.setValue("holiday_status_id", selectedLeaveType);
    }
  }, [selectedLeaveType, form]);

  // Find annual leave id (Cuti Tahunan)
  useEffect(() => {
    if (leaveBalances) {
      const annual = leaveBalances.find(l => l.name.toLowerCase().includes('tahunan'));
      setAnnualLeaveId(annual ? annual.id : null);
    }
  }, [leaveBalances]);

  // Helper: is selected leave annual?
  const isAnnualLeave = annualLeaveId && form.watch('holiday_status_id') === annualLeaveId;

  // Calculate total days
  const dateFrom = form.watch('date_from');
  const dateTo = form.watch('date_to');
  const dateMode = form.watch('date_mode');
  let totalDays = 0;
  if (dateFrom && dateMode === 'half_day') {
    totalDays = 0.5;
  } else if (dateFrom && dateTo && dateMode === 'full_day') {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    from.setHours(0,0,0,0);
    to.setHours(0,0,0,0);
    totalDays = Math.floor((to.getTime() - from.getTime()) / (1000*60*60*24)) + 1;
    if (totalDays < 1) totalDays = 1;
  }

  // Handle opening modal with specific leave type
  const handleNewLeaveRequest = (leaveTypeId: number) => {
    setSelectedLeaveType(leaveTypeId);
    setShowNewLeaveModal(true);
  };

  // Handle form submission
  const onSubmit = async (values: LeaveFormValues) => {
    try {
      // Format dates for Odoo API
      const formatDateForOdoo = (date: Date) => {
        return date.toISOString().replace('T', ' ').split('.')[0];
      };

      // Prepare base data
      const leaveRequestData: any = {
        holiday_allocation_id: false,
        state: "confirm",
        holiday_type: "employee",
        holiday_status_id: values.holiday_status_id,
        name: values.name,
        request_date_from: formatDateForOdoo(values.date_from).split(' ')[0], // Hanya tanggal
        request_date_to: formatDateForOdoo(values.date_to).split(' ')[0], // Hanya tanggal
      };

      // Add half-day specific fields ONLY if annual leave and half-day selected
      if (isAnnualLeave && values.date_mode === "half_day") {
        leaveRequestData.request_unit_half = true;
        leaveRequestData.request_date_from_period = values.request_date_from_period;
        leaveRequestData.request_unit_hours = false;
        leaveRequestData.request_hour_from = false;
        leaveRequestData.request_hour_to = false;
        // Set waktu berdasarkan periode (am/pm)
        if (values.request_date_from_period === "am") {
          leaveRequestData.date_from = `${formatDateForOdoo(values.date_from).split(' ')[0]} 06:00:00`;
          leaveRequestData.date_to = `${formatDateForOdoo(values.date_from).split(' ')[0]} 10:00:00`;
        } else {
          leaveRequestData.date_from = `${formatDateForOdoo(values.date_from).split(' ')[0]} 13:00:00`;
          leaveRequestData.date_to = `${formatDateForOdoo(values.date_from).split(' ')[0]} 17:00:00`;
        }
      } else {
        // For full day or non-annual leave
        leaveRequestData.date_from = `${formatDateForOdoo(values.date_from).split(' ')[0]} 01:00:00`;
        leaveRequestData.date_to = `${formatDateForOdoo(values.date_to).split(' ')[0]} 10:00:00`;
      }

      console.log("Submitting leave request:", leaveRequestData);
      
      // Submit the request
      await createLeaveMutation.mutateAsync(leaveRequestData);
      
      // Auto-refresh leave lists after submit
      queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "confirm"] });
      queryClient.invalidateQueries({ queryKey: ["leaves", "requests", "validate"] });
      
      // Show success message
      toast({
        title: "Permintaan cuti berhasil dibuat",
        description: "Permintaan cuti Anda telah diajukan dan menunggu persetujuan.",
        variant: "default",
      });
      
      // Close the modal and reset form
      setShowNewLeaveModal(false);
      form.reset();
    } catch (error: any) {
      console.error("Error submitting leave request:", error);
      toast({
        title: "Gagal mengajukan cuti",
        description: error.message || "Terjadi kesalahan saat mengajukan cuti. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  // Extract real leave types from Odoo data
  const realLeaveTypes = leaveBalances || [];

  // Show loading skeleton if data is loading
  if (isBalanceLoading && isLeavesLoading) {
    return <PageSkeleton />;
  }

  // Show error message if data failed to load
  if (!leaveBalances && !isBalanceLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 min-h-[50vh]">
        <div className="text-red-500 mb-4 text-4xl">!</div>
        <h3 className="text-lg font-semibold mb-2">Failed to load leave data</h3>
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
    <div className="px-5 pb-safe">
      {/* Status Bar & Header handled by parent component */}
      
      {/* Leave Summary Card */}
      <div className="mt-4 mb-6">
        <div className="modern-card p-5 mb-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-navy font-semibold text-lg">Leave Balance</h3>
              <p className="text-slate-light text-sm">2025 Calendar Year</p>
            </div>
            
            <div className="relative">
              <RadialProgress
                value={leavePercentage}
                label={
                  <div>
                    <p className="text-navy font-semibold text-2xl">{remainingLeave}</p>
                    <p className="text-xs text-slate-light">days left</p>
                  </div>
                }
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="text-center">
              <div className="modern-card-inset rounded-lg py-2 px-3">
                <p className="text-navy font-semibold text-lg">{totalLeave}</p>
                <p className="text-xs text-slate-light">Total</p>
              </div>
            </div>
            <div className="text-center">
              <div className="modern-card-inset rounded-lg py-2 px-3">
                <p className="text-navy font-semibold text-lg">{usedLeave}</p>
                <p className="text-xs text-slate-light">Used</p>
              </div>
            </div>
            <div className="text-center">
              <div className="modern-card-inset rounded-lg py-2 px-3">
                <p className="text-navy font-semibold text-lg">
                  {isPendingLoading ? "..." : pendingCount}
                </p>
                <p className="text-xs text-slate-light">Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Request Leave Button */}
      <div className="mb-8">
        <button 
          onClick={() => setShowNewLeaveModal(true)}
          className="w-full bg-teal text-white py-4 rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-lg flex items-center justify-center"
        >
          <div className="flex items-center">
            <span className="material-icons-round mr-2 text-2xl">event_available</span>
            <span>Request Time Off</span>
          </div>
        </button>

        {/* Leave Balance Summary */}
        <div className="flex justify-between mt-4 px-2">
          <div className="flex items-center">
            <span className="material-icons-round text-teal mr-1 text-sm">event</span>
            <span className="text-xs text-slate">
              Annual: <span className="font-medium">{leaveBalances?.find(l => l.name === 'Cuti Tahunan')?.virtual_remaining_leaves || 0} days</span>
            </span>
          </div>
          <div className="flex items-center">
            <span className="material-icons-round text-orange-500 mr-1 text-sm">healing</span>
            <span className="text-xs text-slate">
              Sick: <span className="font-medium">{leaveBalances?.find(l => l.name === 'Sick Time Off')?.virtual_remaining_leaves || 0} days</span>
            </span>
          </div>
          <div className="flex items-center">
            <span className="material-icons-round text-purple-500 mr-1 text-sm">stars</span>
            <span className="text-xs text-slate">
              Special: <span className="font-medium">{leaveBalances?.filter(l => 
                l.name !== 'Cuti Tahunan' && 
                l.name !== 'Sick Time Off' && 
                l.name !== 'Unpaid'
              ).reduce((acc, curr) => acc + curr.virtual_remaining_leaves, 0)} days</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Pending Leaves */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Pending Leaves</h3>
        </div>
        {isPendingLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : pendingLeaves && pendingLeaves.length > 0 ? (
          pendingLeaves.map((leave: any, index: number) => (
            <div key={index} className="modern-card p-4 mb-4 rounded-xl shadow-sm">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center">
                    <span className="material-icons-round text-yellow-500 text-sm mr-1">hourglass_empty</span>
                    <h4 className="text-navy font-medium">
                      {leave.holiday_status_id?.[1] || "Leave"}
                    </h4>
                  </div>
                  <p className="text-slate text-sm mt-1">
                    {formatDate(leave.date_from)} - {formatDate(leave.date_to)}
                  </p>
                  <p className="text-xs text-slate-light mt-1">
                    {leave.number_of_days} {leave.number_of_days === 1 ? "day" : leave.number_of_days === 0.5 ? "day (half)" : "days"}
                  </p>
                  {leave.name && (
                    <p className="text-xs text-slate mt-1 italic">
                      "{leave.name}"
                    </p>
                  )}
                </div>
                <div className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium h-fit">
                  Pending
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="modern-card p-4 mb-4 rounded-xl shadow-sm">
            <p className="text-slate text-center py-4">No pending leaves</p>
          </div>
        )}
      </div>

      {/* Upcoming (Approved) Leaves */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Upcoming Leaves</h3>
          <Link to="/leave-history" className="text-teal text-sm font-medium">View all</Link>
        </div>
        {isLeavesLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : upcomingLeaves && upcomingLeaves.length > 0 ? (
          upcomingLeaves.map((leave: any, index: number) => (
            <div key={index} className="modern-card p-4 mb-4 rounded-xl shadow-sm">
              <div className="flex justify-between">
                <div>
                  <div className="flex items-center">
                    <span className="material-icons-round text-teal text-sm mr-1">event</span>
                    <h4 className="text-navy font-medium">
                      {leave.holiday_status_id?.[1] || "Leave"}
                    </h4>
                  </div>
                  <p className="text-slate text-sm mt-1">
                    {formatDate(leave.date_from)} - {formatDate(leave.date_to)}
                  </p>
                  <p className="text-xs text-slate-light mt-1">
                    {leave.number_of_days} {leave.number_of_days === 1 ? "day" : "days"}
                  </p>
                  {leave.name && (
                    <p className="text-xs text-slate mt-1 italic">
                      "{leave.name}"
                    </p>
                  )}
                </div>
                <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium h-fit">
                  Approved
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="modern-card p-4 mb-4 rounded-xl shadow-sm">
            <p className="text-slate text-center py-4">No upcoming leaves</p>
          </div>
        )}
      </div>

      {/* Leave Request Modal */}
      <Dialog open={showNewLeaveModal} onOpenChange={setShowNewLeaveModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Fill the form below to submit your leave request.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Leave Type Selection */}
              <FormField
                control={form.control}
                name="holiday_status_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={selectedLeaveType?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {realLeaveTypes.map((type) => (
                          <SelectItem 
                            key={type.id} 
                            value={type.id.toString()}
                          >
                            {type.name} {type.virtual_remaining_leaves > 0 ? 
                              `(${type.virtual_remaining_leaves} days left)` : 
                              `(${type.max_leaves} days allocation)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Leave Reason */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter reason for leave"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration Type (Half Day only for annual leave) */}
              <FormField
                control={form.control}
                name="date_mode"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Duration Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="full_day" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Full Day
                          </FormLabel>
                        </FormItem>
                        {isAnnualLeave && (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="half_day" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Half Day
                            </FormLabel>
                          </FormItem>
                        )}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show period only if half day AND annual leave */}
              {isAnnualLeave && form.watch("date_mode") === "half_day" && (
                <FormField
                  control={form.control}
                  name="request_date_from_period"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Period</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value || "am"}
                          className="flex space-x-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="am" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Morning (8:00 - 12:00)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="pm" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Afternoon (13:00 - 17:00)
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Show total days calculation */}
              <div className="text-sm text-navy font-medium mb-2">
                Total Days: <span className="text-teal font-bold">{totalDays}</span>
              </div>

              {/* Start Date */}
              <FormField
                control={form.control}
                name="date_from"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              formatDate(field.value)
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date (only show if full day) */}
              {form.watch("date_mode") === "full_day" && (
                <FormField
                  control={form.control}
                  name="date_to"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                formatDate(field.value)
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => 
                              date < form.getValues("date_from") || 
                              date < new Date()
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button" 
                  variant="outline"
                  onClick={() => setShowNewLeaveModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createLeaveMutation.isPending}
                >
                  {createLeaveMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}