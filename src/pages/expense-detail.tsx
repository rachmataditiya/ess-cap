import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useOdooAuth, useCompanyData, useExpenseDetails, useExpenseProducts } from "@/hooks/useOdoo";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, ArrowLeft, FilePlus, DollarSign, Tag, Upload, X, FileText, Image, File, Trash2, Plus } from "lucide-react";
import odooClient from "@/lib/odooApi";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

// Definisi tipe data
interface Expense {
  id: number;
  name: string;
  date: string;
  state: string;
  reference: string;
  total_amount: number;
  description: string;
  employee_id: [number, string];
  payment_mode: string;
  company_id: [number, string];
  product_id: [number, string];
  quantity: number;
  unit_amount: number;
  price_subtotal: number;
  analytic_distribution: {[key: string]: number};
}

export default function ExpenseDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useOdooAuth();
  const { data: companyData, isLoading: isLoadingCompany } = useCompanyData();
  const { data: expenseData, isLoading: isLoadingExpense } = useExpenseDetails(id ? parseInt(id) : 0);
  const { data: products } = useExpenseProducts();
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [analyticAccounts, setAnalyticAccounts] = useState<any[]>([]);
  const [analyticDistribution, setAnalyticDistribution] = useState<{[key: string]: number}>({});
  const [analyticError, setAnalyticError] = useState<string | null>(null);
  const [showAddAnalytic, setShowAddAnalytic] = useState(false);
  const [newAnalyticId, setNewAnalyticId] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editPercent, setEditPercent] = useState<number>(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const queryClient = useQueryClient();
  const [editForm, setEditForm] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expense = expenseData?.expense;
  const isEditable = expense && expense.state === 'draft';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prev => [...prev, ...droppedFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5 text-teal" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    return <File className="w-5 h-5 text-slate" />;
  };

  const handleUpload = async () => {
    if (!expenseData?.expense?.id) return;
    
    setIsUploading(true);
    const uploadPromises = files.map(file => 
      odooClient.uploadExpenseAttachment(file, expenseData.expense.id)
    );

    try {
      await Promise.all(uploadPromises);
      toast.success("Lampiran berhasil diunggah");
      setFiles([]);
      fetchAttachments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Gagal mengunggah lampiran");
    } finally {
      setIsUploading(false);
    }
  };

  // Fetch existing attachments for this expense
  const fetchAttachments = async () => {
    if (!expenseData?.expense?.id) return;
    setIsLoadingAttachments(true);
    try {
      const result = await odooClient.searchRead({
        model: "ir.attachment",
        domain: [["res_model", "=", "hr.expense"], ["res_id", "=", expenseData.expense.id]],
        fields: ["id", "name", "mimetype"],
      });
      setAttachments(result);
    } catch (err) {
      setAttachments([]);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  useEffect(() => {
    if (expenseData?.expense?.id) fetchAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseData?.expense?.id]);

  // Delete attachment handler
  const handleDeleteAttachment = async (attachmentId: number) => {
    const confirmDelete = window.confirm("Yakin ingin menghapus lampiran ini?");
    if (!confirmDelete) return;
    try {
      await odooClient.call({
        model: "ir.attachment",
        method: "unlink",
        args: [[attachmentId]],
      });
      toast.success("Lampiran berhasil dihapus");
      fetchAttachments();
    } catch (err) {
      toast.error("Gagal menghapus lampiran");
    }
  };

  // Fetch analytic accounts from Odoo
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const result = await odooClient.searchRead({
          model: "account.analytic.account",
          domain: [],
          fields: ["id", "name"],
        });
        setAnalyticAccounts(result);
      } catch (err) {
        setAnalyticAccounts([]);
      }
    };
    if (expense?.id) {
      fetchAccounts();
    }
  }, [expense?.id]);

  // Set initial analytic_distribution from expense
  useEffect(() => {
    if (expense?.id && expense?.analytic_distribution) {
      setAnalyticDistribution({ ...expense.analytic_distribution });
    }
  }, [expense?.id, expense?.analytic_distribution]);

  // Helper: update analytic_distribution in Odoo and reload
  const updateAnalyticDistribution = async (newDist: {[key: string]: number}) => {
    if (!expenseData?.expense?.id) return;
    try {
      await odooClient.call({
        model: "hr.expense",
        method: "write",
        args: [[expenseData.expense.id], { analytic_distribution: newDist }],
      });
      // Reload from Odoo
      const refreshed = await odooClient.searchRead({
        model: "hr.expense",
        domain: [["id", "=", expenseData.expense.id]],
        fields: ["analytic_distribution"],
      });
      if (refreshed.length && refreshed[0].analytic_distribution) {
        setAnalyticDistribution({ ...refreshed[0].analytic_distribution });
      } else {
        setAnalyticDistribution({});
      }
    } catch (err) {
      toast.error("Gagal update analytic distribution ke Odoo");
    }
  };

  // Handler for opening add modal
  const openAddAnalytic = () => {
    setNewAnalyticId("");
    setShowAddAnalytic(true);
  };
  // Handler for adding analytic from modal
  const handleAddAnalyticModal = async () => {
    if (!newAnalyticId || newAnalyticId in analyticDistribution) return;
    const newDist = { ...analyticDistribution, [newAnalyticId]: 100 };
    setShowAddAnalytic(false);
    await updateAnalyticDistribution(newDist);
  };
  // Handler for editing percent inline
  const startEditPercent = (id: string, percent: number) => {
    setEditId(id);
    setEditPercent(percent);
  };
  const saveEditPercent = async (id: string) => {
    const newDist = { ...analyticDistribution, [id]: editPercent };
    setEditId(null);
    await updateAnalyticDistribution(newDist);
  };
  const cancelEditPercent = () => {
    setEditId(null);
  };

  // Handler for removing analytic line
  const handleRemoveAnalytic = async (id: string) => {
    const newDist = { ...analyticDistribution };
    delete newDist[id];
    await updateAnalyticDistribution(newDist);
  };

  // Submit expense handler (include analytic_distribution)
  const handleSubmitExpense = async () => {
    if (!expenseData?.expense?.id) return;
    if (analyticError) {
      toast.error(analyticError);
      return;
    }
    setIsSubmitting(true);
    try {
      await odooClient.call({
        model: "hr.expense",
        method: "write",
        args: [[expenseData.expense.id], { analytic_distribution: analyticDistribution }],
      });
      const result = await odooClient.call({
        model: "hr.expense",
        method: "action_submit_expenses",
        args: [[expenseData.expense.id]],
      });
      console.log("Result action_submit_expenses:", result);

      // Log context for debug
      console.log("Context from response:", result?.context);

      // Ambil ID expense dari context.default_expense_line_ids
      let expenseId = expenseData.expense.id;
      if (
        result?.context?.default_expense_line_ids &&
        Array.isArray(result.context.default_expense_line_ids) &&
        result.context.default_expense_line_ids.length > 0
      ) {
        const cmd = result.context.default_expense_line_ids[0];
        if (Array.isArray(cmd) && cmd.length === 3 && Array.isArray(cmd[2]) && cmd[2].length > 0) {
          expenseId = cmd[2][0];
        }
      }
      console.log("Expense ID for sheet search:", expenseId);

      // Ambil nama sheet dari context jika ada
      const sheetName = result?.context?.default_name;

      // Tambahkan delay sebelum searchRead
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Cari semua sheet draft milik employee, filter juga dengan nama sheet jika ada
      let domain = [
        ["state", "=", "draft"],
        ["employee_id", "=", expenseData.expense.employee_id[0]],
      ];
      if (sheetName) {
        domain.push(["name", "=", sheetName]);
      }

      const allSheets = await odooClient.searchRead({
        model: "hr.expense.sheet",
        domain,
        fields: ["id", "state", "expense_line_ids", "name"],
        order: "id desc",
        limit: 10,
      });
      console.log("All draft sheets for employee:", allSheets);

      // Cari sheet yang mengandung expenseId
      let sheetId = null;
      for (const sheet of allSheets) {
        if (sheet.expense_line_ids && sheet.expense_line_ids.includes(expenseId)) {
          sheetId = sheet.id;
          break;
        }
      }
      // Jika tidak ketemu, fallback ke sheet dengan nama yang sama
      if (!sheetId && allSheets.length === 1) {
        sheetId = allSheets[0].id;
      }

      if (sheetId) {
        await odooClient.call({
          model: "hr.expense.sheet",
          method: "action_submit_sheet",
          args: [[sheetId]],
        });
        // Fetch again to get final state
        const refreshed2 = await odooClient.searchRead({
          model: "hr.expense",
          domain: [["id", "=", expenseData.expense.id]],
          fields: ["state", "sheet_id"],
        });
        if (refreshed2.length) {
          expenseData.expense.state = refreshed2[0].state;
          expenseData.expense.sheet_id = refreshed2[0].sheet_id;
        }
        setIsSubmitted(true);
        setSuccessMessage("Pengeluaran berhasil disubmit ke manager!");
        toast.success("Pengeluaran berhasil disubmit ke manager!");
        // Auto-refresh detail & list
        queryClient.invalidateQueries({ queryKey: ["expense", "details", expenseData.expense.id] });
        queryClient.invalidateQueries({ queryKey: ["expenses"] });
      } else {
        // Coba buat sheet manual dari context
        const context = result?.context || {};
        const sheetVals = {
          company_id: context.default_company_id,
          employee_id: context.default_employee_id,
          name: context.default_name,
          expense_line_ids: context.default_expense_line_ids,
          state: context.default_state || 'draft',
        };
        console.log("Creating sheet manually with vals:", sheetVals);
        const createdSheetId = await odooClient.call({
          model: "hr.expense.sheet",
          method: "create",
          args: [sheetVals],
        });
        if (createdSheetId) {
          await odooClient.call({
            model: "hr.expense.sheet",
            method: "action_submit_sheet",
            args: [[createdSheetId]],
          });
          setIsSubmitted(true);
          setSuccessMessage("Sheet berhasil dibuat dan disubmit ke manager!");
          toast.success("Sheet berhasil dibuat dan disubmit ke manager!");
          // Auto-refresh detail & list
          queryClient.invalidateQueries({ queryKey: ["expense", "details", expenseData.expense.id] });
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        } else {
          toast.error("Sheet tidak berhasil dibuat. Cek context dan data expense.");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Gagal submit pengeluaran");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isEditable && expense) {
      setEditForm({
        name: expense.name || "",
        date: expense.date || "",
        product_id: expense.product_id?.[0]?.toString() || "",
        total_amount: expense.total_amount || 0,
        description: expense.description || "",
        payment_mode: expense.payment_mode || "own_account",
        reference: expense.reference || "",
      });
    }
  }, [isEditable, expense]);

  const handleEditChange = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  // Helper untuk validasi value Select kategori
  const getValidProductId = () => {
    if (!products) return "";
    if (products.find((p: any) => p.id.toString() === (editForm?.product_id || ""))) {
      return editForm?.product_id || "";
    }
    // fallback ke produk pertama jika ada
    return products.length > 0 ? products[0].id.toString() : "";
  };

  const handleSave = async () => {
    if (!expense?.id) return;
    setIsSaving(true);
    try {
      const updateData: any = {
        name: editForm.name,
        date: editForm.date,
        total_amount: Number(editForm.total_amount),
        description: editForm.description,
        payment_mode: editForm.payment_mode,
        reference: editForm.reference,
      };
      await odooClient.call({
        model: "hr.expense",
        method: "write",
        args: [[expense.id], updateData],
      });
      toast.success("Perubahan berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["expense", "details", expense.id] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
    } catch (err) {
      toast.error("Gagal menyimpan perubahan");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingExpense || isLoadingCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="w-8 h-8 text-teal animate-spin mb-4" />
        <p className="text-navy">Memuat data pengeluaran...</p>
      </div>
    );
  }

  if (!expenseData?.expense) {
    return (
      <div className="px-5 pb-safe pt-6">
        <header className="flex items-center mb-6">
          <Link to="/expenses" className="mr-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate" title="Kembali ke daftar pengeluaran">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-navy">Detail Pengeluaran</h1>
            <p className="text-slate-light text-sm">Informasi detail pengeluaran</p>
          </div>
        </header>

        <div className="text-center p-8 modern-card rounded-xl">
          <FilePlus className="w-12 h-12 text-red-500 mx-auto mb-4"/>
          <h3 className="text-xl font-semibold text-navy mb-2">Pengeluaran Tidak Ditemukan</h3>
          <p className="text-slate mb-4">Pengeluaran yang Anda cari tidak dapat ditemukan.</p>
          <Link to="/expenses">
            <button className="bg-teal text-white px-4 py-2 rounded-lg flex items-center justify-center mx-auto shadow-sm hover:bg-teal/80 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Daftar Pengeluaran
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-safe pt-6">
      <header className="flex items-center mb-6">
        <Link to="/expenses" className="mr-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate" title="Kembali ke daftar pengeluaran">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Detail Pengeluaran</h1>
          <p className="text-slate-light text-sm">Informasi detail pengeluaran</p>
        </div>
      </header>

      {/* Simple Expense Info Card */}
      {expense && (
        <div className="mb-4 modern-card p-4 rounded-xl shadow-sm">
          {isEditable && editForm ? (
            <form className="space-y-3" onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="block text-slate text-sm mb-1">Nama</label>
                <Input value={editForm.name} onChange={e => handleEditChange('name', e.target.value)} required disabled={isSaving} />
              </div>
              <div>
                <label className="block text-slate text-sm mb-1">Tanggal</label>
                <Input type="date" value={editForm.date} onChange={e => handleEditChange('date', e.target.value)} required disabled={isSaving} />
              </div>
              <div>
                <label className="block text-slate text-sm mb-1">Kategori</label>
                <div className="text-navy font-medium p-2 bg-slate/5 rounded">
                  {products?.find((p: any) => p.id.toString() === editForm.product_id)?.name || 'Loading...'}
                </div>
              </div>
              <div>
                <label className="block text-slate text-sm mb-1">Jumlah</label>
                <Input type="number" value={editForm.total_amount} onChange={e => handleEditChange('total_amount', e.target.value)} required min={0} disabled={isSaving} />
              </div>
              <div>
                <label className="block text-slate text-sm mb-1">Deskripsi</label>
                <Textarea value={editForm.description} onChange={e => handleEditChange('description', e.target.value)} disabled={isSaving} />
              </div>
              <div>
                <label className="block text-slate text-sm mb-1">Payment Mode</label>
                <Select value={editForm.payment_mode} onValueChange={val => handleEditChange('payment_mode', val)} disabled={isSaving}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih mode pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own_account">Own Account</SelectItem>
                    <SelectItem value="company_account">Company Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-slate text-sm mb-1">Reference</label>
                <Input value={editForm.reference} onChange={e => handleEditChange('reference', e.target.value)} disabled={isSaving} />
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Simpan
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="mb-2 font-bold text-navy text-lg">{expense.name}</div>
              <div className="text-slate text-sm">Tanggal: {formatDate(expense.date)}</div>
              <div className="text-slate text-sm">Status: {expense.state}</div>
              <div className="text-slate text-sm">Total: {formatCurrency(expense.total_amount)}</div>
              {expense.description && (
                <div className="text-slate-light text-sm mt-2">Deskripsi: {expense.description}</div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* List Existing Attachments Card */}
      {expense && (
        <div className="mb-4 modern-card p-4 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-navy mb-3">Lampiran Tersimpan</h3>
          {isLoadingAttachments ? (
            <div className="text-slate text-sm">Memuat lampiran...</div>
          ) : attachments.length === 0 ? (
            <div className="text-slate-light text-sm">Belum ada lampiran.</div>
          ) : (
            <ul className="divide-y divide-slate/10">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-slate" />
                    <span className="text-navy text-sm font-medium">{att.name}</span>
                  </div>
                  <button
                    className="text-red-500 hover:bg-red-50 rounded px-2 py-1 text-xs font-semibold"
                    onClick={() => handleDeleteAttachment(att.id)}
                    disabled={!isEditable}
                    title="Hapus"
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Attachment Upload Section */}
      <div className="modern-card p-4 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-navy mb-4">Lampiran</h3>
        
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
            isDragging ? 'border-teal bg-teal/5' : 'border-slate/20'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-teal mb-3" />
            <p className="text-navy font-medium mb-1">Seret file ke sini atau</p>
            <label className="bg-teal text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-teal/80 transition-colors">
              <span>Pilih File</span>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={handleFileInput}
                disabled={!isEditable}
              />
            </label>
            <p className="text-slate-light text-sm mt-2">
              Format yang didukung: PDF, JPG, PNG (Maks. 10MB)
            </p>
          </div>
        </div>

        {/* File Preview Section */}
        {files.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-navy mb-3">File Terpilih</h4>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate/5 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-navy font-medium">{file.name}</p>
                      <p className="text-slate-light text-sm">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-slate/10 rounded-full transition-colors"
                    title="Hapus file"
                    disabled={!isEditable}
                  >
                    <X className="w-4 h-4 text-slate" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <div className="mt-6">
            <button
              className="w-full bg-teal text-white py-3 rounded-lg font-medium hover:bg-teal/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleUpload}
              disabled={!isEditable || isUploading}
            >
              {isUploading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengunggah...
                </div>
              ) : (
                'Unggah Lampiran'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Analytic Distribution Field - Mobile Friendly */}
      <div className="mb-4 mt-6 modern-card p-4 rounded-xl shadow-sm">
        <h3 className="text-lg font-bold text-navy mb-3">Analytic</h3>
        {Object.keys(analyticDistribution).length === 0 && (
          <div className="text-slate-light text-sm mb-2">Belum ada pembagian analytic.</div>
        )}
        <ul className="space-y-3 mb-4">
          {Object.entries(analyticDistribution).map(([id, percent]) => {
            const acc = analyticAccounts.find(a => String(a.id) === String(id));
            return (
              <li key={id} className="flex items-center justify-between bg-slate/5 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-navy text-sm truncate">{acc ? acc.name : id}</div>
                </div>
                <div className="flex items-center space-x-2">
                  {editId === id ? (
                    <>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="border rounded px-2 py-1 w-16 text-sm"
                        value={editPercent}
                        onChange={e => setEditPercent(Number(e.target.value))}
                        autoFocus
                        onBlur={() => saveEditPercent(id)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditPercent(id); if (e.key === 'Escape') cancelEditPercent(); }}
                        placeholder="Persentase"
                        title="Edit Persentase"
                      />
                      <span className="text-slate text-xs">%</span>
                    </>
                  ) : (
                    <button
                      className="text-navy text-sm font-semibold px-2 py-1 rounded hover:bg-slate/10"
                      onClick={() => startEditPercent(id, percent)}
                      type="button"
                      title="Edit Persentase"
                      disabled={!isEditable}
                    >
                      {percent}%
                    </button>
                  )}
                  <button
                    className="text-red-500 hover:bg-red-50 rounded p-1"
                    onClick={() => handleRemoveAnalytic(id)}
                    type="button"
                    aria-label="Hapus Analytic"
                    title="Hapus Analytic"
                    disabled={!isEditable}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {/* Add Analytic Button */}
        <button
          className="w-full flex items-center justify-center gap-2 bg-teal text-white py-2 rounded-lg font-medium hover:bg-teal/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          type="button"
          onClick={openAddAnalytic}
          disabled={!isEditable || analyticAccounts.length === 0 || Object.keys(analyticDistribution).length >= analyticAccounts.length}
        >
          <Plus className="w-4 h-4" /> Tambah Analytic
        </button>
      </div>
      {/* Modal Add Analytic */}
      {showAddAnalytic && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-navy">Tambah Analytic</h4>
              <button onClick={() => setShowAddAnalytic(false)} className="text-slate"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-slate text-sm mb-1">Analytic Account</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={newAnalyticId}
                onChange={e => setNewAnalyticId(e.target.value)}
                title="Pilih Analytic Account"
              >
                <option value="">Pilih Analytic Account</option>
                {analyticAccounts.filter(a => !(a.id in analyticDistribution)).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <button
              className="w-full bg-teal text-white py-2 rounded-lg font-medium hover:bg-teal/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAddAnalyticModal}
              disabled={!isEditable || !newAnalyticId}
            >
              Tambah
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {isSubmitted && (
        <div className="mb-4 p-4 rounded-xl bg-green-100 text-green-800 text-center font-semibold">
          {successMessage}
        </div>
      )}

      {/* Overlay loading saat submit */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl p-6 flex flex-col items-center shadow-lg">
            <Loader2 className="w-8 h-8 text-teal animate-spin mb-3" />
            <span className="text-navy font-semibold">Memproses submit expense...</span>
          </div>
        </div>
      )}

      {/* Submit Button if status is draft */}
      {expense && expense.state === 'draft' && (
        <button
          className="mt-6 w-full bg-teal text-white py-3 rounded-lg font-medium hover:bg-teal/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmitExpense}
          disabled={!isEditable || attachments.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Memproses...</span>
          ) : (
            "Submit Pengeluaran"
          )}
        </button>
      )}
    </div>
  );
} 