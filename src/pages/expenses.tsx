import { useState } from "react";
import { Link, useLocation } from "wouter";
import { NeumorphicCard, NeumorphicButton } from "@/components/ui/neumorphic";
import { useExpenses, useExpenseTypes, useCreateExpense, useExpenseProducts, useDeleteExpense } from "@/hooks/useOdoo";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ReceiptIcon, PlusIcon, ArrowLeftIcon, DollarSignIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const expenseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  product_id: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  total_amount: z.number().min(0, "Amount must be greater than 0"),
  description: z.string().optional(),
  quantity: z.number().default(1),
  payment_mode: z.string().default("own_account"),
  reference: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface Product {
  id: number;
  name: string;
  lst_price: number;
  default_code?: string;
}

export default function Expenses() {
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const { data: expenses, isLoading: isExpensesLoading } = useExpenses();
  const { data: expenseTypes, isLoading: isTypesLoading } = useExpenseTypes();
  const createExpense = useCreateExpense();
  const { data: products, isLoading: isLoadingProducts } = useExpenseProducts();
  const deleteExpense = useDeleteExpense();
  const [, navigate] = useLocation();

  // Calculate totals
  const totalExpenses = expenses?.reduce((acc: number, item: any) => acc + (item.total_amount || 0), 0) || 0;
  const pendingExpenses = expenses?.filter((e: any) => e.state === 'draft').length || 0;
  const approvedExpenses = expenses?.filter((e: any) => e.state === 'approved').length || 0;
  
  // Form handling
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: "",
      product_id: "",
      date: new Date().toISOString().split("T")[0],
      total_amount: 0,
      description: "",
      quantity: 1,
      payment_mode: "own_account",
      reference: "",
    },
  });

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      const expenseData = {
        ...data,
        product_id: data.product_id ? parseInt(data.product_id) : undefined,
      };
      const newId = await createExpense.mutateAsync(expenseData);
      toast.success("Expense submitted successfully");
      setShowNewExpenseModal(false);
      form.reset();
      navigate(`/expenses/${newId}`);
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast.error("Failed to submit expense");
    }
  };

  return (
    <div className="px-5 pb-safe">
      {/* Header with back button */}
      <header className="pt-6 pb-4 flex items-center">
        <Link href="/dashboard" className="mr-4">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate"
            aria-label="Go back to dashboard"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Expenses</h1>
          <p className="text-slate-light text-sm">Manage your expense requests</p>
        </div>
      </header>

      {/* Expense Summary Card */}
      <div className="mt-4 mb-6">
        <div className="modern-card p-5 mb-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-navy font-semibold text-lg">Expense Summary</h3>
              <p className="text-slate-light text-sm">2025 Calendar Year</p>
            </div>
            
            <div className="relative">
              <div className="text-navy font-semibold text-2xl">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="text-xs text-slate-light">total expenses</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="text-center">
              <div className="modern-card-inset rounded-lg py-2 px-3">
                <p className="text-navy font-semibold text-lg">{expenses?.length || 0}</p>
                <p className="text-xs text-slate-light">Total</p>
              </div>
            </div>
            <div className="text-center">
              <div className="modern-card-inset rounded-lg py-2 px-3">
                <p className="text-navy font-semibold text-lg">{approvedExpenses}</p>
                <p className="text-xs text-slate-light">Approved</p>
              </div>
            </div>
            <div className="text-center">
              <div className="modern-card-inset rounded-lg py-2 px-3">
                <p className="text-navy font-semibold text-lg">{pendingExpenses}</p>
                <p className="text-xs text-slate-light">Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Expense Button */}
      <div className="mb-8">
        <button 
          onClick={() => setShowNewExpenseModal(true)}
          className="w-full bg-teal text-white py-4 rounded-xl shadow-md hover:shadow-lg transition-all font-medium text-lg flex items-center justify-center"
        >
          <div className="flex items-center">
            <PlusIcon className="w-5 h-5 mr-2" />
            <span>New Expense</span>
          </div>
        </button>
      </div>

      {/* Expense List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-navy font-semibold">Recent Expenses</h3>
          <Link to="/expenses-history" className="text-teal text-sm font-medium">View all</Link>
        </div>
        
        {isExpensesLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : expenses && expenses.length > 0 ? (
          expenses.map((expense: any) => (
            <div key={expense.id} className="relative group mb-4">
              <Link to={`/expenses/${expense.id}`} className="block">
                <NeumorphicCard className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-navy font-medium">{expense.name}</h4>
                      <div className="flex items-center mt-1 text-slate text-sm">
                        <span>{formatDate(expense.date)}</span>
                        {expense.description && (
                          <span className="ml-2 text-slate-light">"{expense.description}"</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end relative min-w-[90px]">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        expense.state === 'approved' ? 'bg-green-100 text-green-700' :
                        expense.state === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        expense.state === 'refused' ? 'bg-red-100 text-red-700' :
                        'bg-teal/10 text-teal'
                      }`}>
                        {expense.state.charAt(0).toUpperCase() + expense.state.slice(1)}
                      </span>
                      <span className="text-slate text-sm mt-1">
                        {expense.reference ? `Ref: ${expense.reference}` : "No reference"}
                      </span>
                      <span className="text-teal font-medium mt-1">
                        {formatCurrency(expense.total_amount)}
                      </span>
                      {expense.state === 'draft' && (
                        <button
                          className="mt-3 p-2 rounded-full bg-white shadow hover:bg-red-100 text-red-500 transition-opacity opacity-90 focus:opacity-100"
                          title="Hapus Pengeluaran"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.confirm('Yakin ingin menghapus pengeluaran ini?')) {
                              deleteExpense.mutate(expense.id, {
                                onSuccess: () => toast.success('Pengeluaran berhasil dihapus'),
                                onError: () => toast.error('Gagal menghapus pengeluaran'),
                              });
                            }
                          }}
                          disabled={deleteExpense.isPending}
                          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </NeumorphicCard>
              </Link>
            </div>
          ))
        ) : (
          <NeumorphicCard className="p-4">
            <div className="flex flex-col items-center justify-center text-center py-4">
              <ReceiptIcon className="w-12 h-12 text-slate-light mb-2" />
              <p className="text-navy font-medium">No expenses found</p>
              <p className="text-slate-light text-sm mt-1">
                You haven't submitted any expenses yet
              </p>
            </div>
          </NeumorphicCard>
        )}
      </div>

      {/* New Expense Modal */}
      <Dialog open={showNewExpenseModal} onOpenChange={setShowNewExpenseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Expense</DialogTitle>
            <DialogDescription>
              Fill the form below to submit your expense request.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter expense name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products?.map((product: Product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Enter amount" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter expense description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="own_account">Own Account</SelectItem>
                        <SelectItem value="company_account">Company Account</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional reference number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button" 
                  variant="outline"
                  onClick={() => setShowNewExpenseModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createExpense.isPending}
                >
                  {createExpense.isPending ? (
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