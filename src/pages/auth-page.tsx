import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOdooAuth } from "@/hooks/useOdoo";
import { LoadingFallback } from "@/components/ui/loading-skeleton";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username harus diisi" }),
  password: z.string().min(1, { message: "Password harus diisi" }),
});

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, isLoginPending, isAuthenticated, isLoading } = useOdooAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Initialize form (always initialize hooks at the top level)
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Show loading state while authentication is being checked
  if (isLoading) {
    return <LoadingFallback />;
  }

  // Redirect to home if already logged in
  if (isAuthenticated) {
    navigate("/");
    return null;
  }

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      setIsLoggingIn(true);
      
      login({
        username: values.username,
        password: values.password,
        db: import.meta.env.VITE_ODOO_DB || 'odoo16_prod_arkana',
      }, {
        onSuccess: () => {
          toast({
            title: "Login berhasil",
            description: "Selamat datang kembali!",
          });
          navigate("/");
        },
        onError: (error: any) => {
          toast({
            title: "Login gagal",
            description: error.message || "Pastikan username dan password benar",
            variant: "destructive",
          });
          setIsLoggingIn(false);
        }
      });
    } catch (error: any) {
      toast({
        title: "Login gagal",
        description: error.message || "Terjadi kesalahan saat login",
        variant: "destructive",
      });
      setIsLoggingIn(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Form Column */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-12 bg-white relative">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-teal-50 rounded-br-full opacity-70"></div>
        <div className="absolute bottom-0 right-0 w-40 h-40 bg-teal-50 rounded-tl-full opacity-70"></div>
        
        <div className="max-w-lg mx-auto w-full z-10">
          <div className="text-center mb-10">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-teal to-teal-600 rounded-2xl shadow-lg transform rotate-12"></div>
              <div className="absolute inset-1 bg-white rounded-xl flex items-center justify-center transform -rotate-12">
                <span className="material-icons-round text-teal text-4xl">person</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal to-teal-600">HR Portal</h1>
            <p className="text-slate-light mt-2 text-lg">
              Employee Self Service
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="mb-5">
                      <FormLabel className="text-navy font-medium">Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-slate-light">
                            <span className="material-icons-round">person</span>
                          </span>
                          <Input 
                            placeholder="Masukkan username anda" 
                            {...field} 
                            className="h-12 pl-10 bg-gray-50 focus:ring-teal focus:border-teal rounded-xl"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-navy font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-slate-light">
                            <span className="material-icons-round">lock</span>
                          </span>
                          <Input 
                            type="password" 
                            placeholder="Masukkan password anda" 
                            {...field} 
                            className="h-12 pl-10 bg-gray-50 focus:ring-teal focus:border-teal rounded-xl"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-teal to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold text-lg rounded-xl shadow-md hover:shadow-lg transform transition-all duration-300 hover:-translate-y-1"
                disabled={isLoggingIn || isLoginPending}
              >
                {(isLoggingIn || isLoginPending) ? 
                  <span className="flex items-center justify-center">
                    <span className="material-icons-round animate-spin mr-2">refresh</span>
                    Sedang masuk...
                  </span> : 
                  <span className="flex items-center justify-center">
                    <span className="material-icons-round mr-2">login</span>
                    Masuk
                  </span>
                }
              </Button>
            </form>
          </Form>

          <div className="mt-10 text-center text-slate-light">
            <p>© 2025 Arkana Digital Indonesia</p>
          </div>
        </div>
      </div>

      {/* Hero Column */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-teal-600 to-teal-900 text-white relative overflow-hidden">
        {/* Abstract patterns */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply opacity-20 -translate-y-1/4 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply opacity-20 translate-y-1/4 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col justify-center items-start h-full p-16">
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">Selamat Datang!</h2>
            <p className="text-lg mb-10 text-teal-100">
              Akses informasi HR, ajukan cuti, lihat slip gaji, dan layanan lainnya dalam satu portal.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start group hover:translate-x-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 flex items-center justify-center mr-5 shadow-lg">
                  <span className="material-icons-round text-white">event_note</span>
                </div>
                <div>
                  <h3 className="font-semibold text-xl">Kelola Cuti</h3>
                  <p className="text-teal-100 mt-1">Ajukan dan pantau semua jenis cuti dengan mudah</p>
                </div>
              </div>
              
              <div className="flex items-start group hover:translate-x-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 flex items-center justify-center mr-5 shadow-lg">
                  <span className="material-icons-round text-white">punch_clock</span>
                </div>
                <div>
                  <h3 className="font-semibold text-xl">Absensi</h3>
                  <p className="text-teal-100 mt-1">Catat kehadiran dan pantau jam kerja Anda</p>
                </div>
              </div>
              
              <div className="flex items-start group hover:translate-x-1 transition-transform duration-300">
                <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 flex items-center justify-center mr-5 shadow-lg">
                  <span className="material-icons-round text-white">receipt_long</span>
                </div>
                <div>
                  <h3 className="font-semibold text-xl">Dokumen Payroll</h3>
                  <p className="text-teal-100 mt-1">Akses slip gaji dan unduh dokumen pajak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}