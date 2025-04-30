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
  username: z.string()
    .min(1, { message: "Email harus diisi" })
    .email({ message: "Format email tidak valid" }),
  password: z.string().min(1, { message: "Password harus diisi" }),
});

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login, isLoginPending, isAuthenticated, isLoading } = useOdooAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (isLoading) {
    return <LoadingFallback />;
  }

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
            description: error.message || "Pastikan email dan password benar",
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
    <div className="h-screen flex flex-col bg-soft-gradient">
      {/* Header */}
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="max-w-md mx-auto w-full">
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <div className="absolute inset-0 bg-gradient-to-br from-teal to-teal-600 rounded-2xl shadow-lg transform rotate-12"></div>
              <div className="absolute inset-1 bg-white rounded-xl flex items-center justify-center transform -rotate-12">
                <span className="material-icons-round text-teal text-2xl">work</span>
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal to-teal-600">HR Portal</h1>
            <p className="text-slate-light mt-1 text-xs">
              Employee Self Service
            </p>
          </div>

          {/* Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-gray-100">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className="mb-3">
                      <FormLabel className="text-navy text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-slate-light">
                            <span className="material-icons-round text-base">person</span>
                          </span>
                          <Input 
                            placeholder="Masukkan email anda" 
                            {...field} 
                            className="h-10 pl-10 bg-gray-50 focus:ring-teal focus:border-teal rounded-xl text-sm"
                            autoComplete="username"
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
                      <FormLabel className="text-navy text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-3 text-slate-light">
                            <span className="material-icons-round text-base">lock</span>
                          </span>
                          <Input 
                            type="password" 
                            placeholder="Masukkan password anda" 
                            {...field} 
                            className="h-10 pl-10 bg-gray-50 focus:ring-teal focus:border-teal rounded-xl text-sm"
                            autoComplete="current-password"
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
                className="w-full h-11 bg-gradient-to-r from-teal to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium text-sm rounded-xl shadow-sm"
                disabled={isLoggingIn || isLoginPending}
              >
                {(isLoggingIn || isLoginPending) ? 
                  <span className="flex items-center justify-center">
                    <span className="material-icons-round animate-spin mr-2 text-base">refresh</span>
                    Sedang masuk...
                  </span> : 
                  <span className="flex items-center justify-center">
                    <span className="material-icons-round mr-2 text-base">login</span>
                    Masuk
                  </span>
                }
              </Button>
            </form>
          </Form>

          {/* Footer */}
          <div className="mt-6 text-center text-slate-light text-xs">
            <p>© 2025 Arkana Digital Indonesia</p>
          </div>
        </div>
      </div>
    </div>
  );
}