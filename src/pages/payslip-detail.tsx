import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { useOdooAuth, useCompanyData, usePayslipDetails, usePayslipById } from "@/hooks/useOdoo";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, ArrowLeft, FileDown, FilePlus, DollarSign, Tag } from "lucide-react";
import { generatePayslipPdf } from "@/utils/payslipPdfGenerator";

// Definisi tipe data
interface PayslipLine {
  id: number;
  name: string;
  code: string;
  category_id: [number, string];
  quantity: number;
  rate: number;
  amount: number;
  total: number;
  slip_id: [number, string];
  date_from: string;
  date_to: string;
  state: string;
  number: string;
}

// Kategori untuk pengelompokan - sesuai dengan kode dari Odoo
const additionCodes = ["BASIC", "PALW", "PA", "PINCENTIVE", "REIMB", "FEE", "OVT", "ALW", "TR", "T", "EA"];
const deductionCodes = ["DED", "PPH21", "LOAN", "DT", "ED", "PPH"];
const companyCodes = ["BPJSKES", "BPJSTK", "JPP", "COMP", "TA"];

// Fungsi helper untuk menentukan kategori berdasarkan kode dan category_id
const getCategoryByCode = (line: PayslipLine) => {
  // Periksa berdasarkan kode
  const code = line.code || '';
  if (additionCodes.includes(code)) return 'addition';
  if (deductionCodes.includes(code)) return 'deduction';
  if (companyCodes.includes(code)) return 'company';

  // Periksa berdasarkan category_id
  if (line.category_id) {
    const categoryName = line.category_id[1]?.toLowerCase() || '';
    if (categoryName.includes('basic') || categoryName.includes('allowance') || 
        categoryName.includes('tunjangan') || categoryName.includes('earning')) {
      return 'addition';
    }
    if (categoryName.includes('deduction') || categoryName.includes('potongan') || 
        categoryName.includes('tax') || categoryName.includes('pajak')) {
      return 'deduction';
    }
    if (categoryName.includes('company') || categoryName.includes('employer') || 
        categoryName.includes('perusahaan') || categoryName.includes('contribution')) {
      return 'company';
    }
  }

  // Periksa berdasarkan nama komponen
  const name = line.name?.toLowerCase() || '';
  if (name.includes('potongan') || name.includes('deduction') || 
      name.includes('pajak') || name.includes('tax') || name.includes('pph')) {
    return 'deduction';
  }

  // Nilai negatif biasanya merupakan potongan
  if (line.amount < 0) {
    return 'deduction';
  }
  
  return 'other';
};

export default function PayslipDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useOdooAuth();
  const { data: companyData, isLoading: isLoadingCompany } = useCompanyData();
  const { data: payslip, isLoading: isLoadingPayslip } = usePayslipById(id ? parseInt(id) : 0);
  const { data: payslipLines, isLoading: isLoadingLines } = usePayslipDetails(id ? parseInt(id) : 0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Debug logs
  useEffect(() => {
    console.log('Payslip ID:', id);
    console.log('Payslip Data:', payslip);
    console.log('Payslip Lines:', payslipLines);
  }, [id, payslip, payslipLines]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    setIsLoading(false);
  }, [id, isAuthenticated]);

  // Filter untuk Penghasilan (hanya BASIC dan PALW)
  const validAdditionCodes = ['BASIC', 'PALW'];
  const additions = payslipLines?.filter(line => 
    line.amount !== 0 && 
    validAdditionCodes.includes(line.code || '')
  ) || [];

  // Pisahkan potongan pajak dan non-pajak untuk menghindari redundansi
  
  // Ambil potongan non-pajak (BPJS, JHT, dll)
  const nonTaxDeductions = payslipLines?.filter(line => {
    if (line.amount === 0) return false;
    
    // Pastikan ini bukan komponen pajak
    const isNotTax = !(line.name && 
      (line.name.toLowerCase().includes('tax') || 
       line.name.toLowerCase().includes('pajak') || 
       line.name.toLowerCase().includes('pph')));
    
    return isNotTax && getCategoryByCode(line) === 'deduction';
  }) || [];
  
  // Ambil hanya satu komponen pajak (prioritaskan INCOME_TAX)
  let taxDeduction = null;
  if (payslipLines) {
    for (const line of payslipLines) {
      if (line.amount === 0) continue;
      
      if (line.code === 'INCOME_TAX') {
        taxDeduction = line;
        break;
      }
    }
    
    // Jika tidak ditemukan INCOME_TAX, coba TOTAL_INCTAX
    if (!taxDeduction) {
      for (const line of payslipLines) {
        if (line.amount === 0) continue;
        
        if (line.code === 'TOTAL_INCTAX') {
          taxDeduction = line;
          break;
        }
      }
    }
  }
  
  // Gabungkan potongan pajak dan non-pajak
  const deductions = taxDeduction ? [...nonTaxDeductions, taxDeduction] : nonTaxDeductions;

  // Filter untuk Kontribusi Perusahaan (hanya komponen spesifik)
  const validCompanyCodes = ['BPJSCOMP', 'JKK', 'JKM', 'JPK', 'JHT_COMP'];
  const contributions = payslipLines?.filter(line => 
    line.amount !== 0 && 
    validCompanyCodes.includes(line.code || '')
  ) || [];

  // Sums
  const totalAdditions = additions.reduce((sum, line) => sum + line.amount, 0);
  const totalDeductions = deductions.reduce((sum, line) => sum + line.amount, 0);
  const totalContributions = contributions.reduce((sum, line) => sum + line.amount, 0);

  if (isLoading || isLoadingPayslip || isLoadingLines) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="w-8 h-8 text-teal animate-spin mb-4" />
        <p className="text-navy">Memuat data slip gaji...</p>
      </div>
    );
  }

  if (!payslip || !payslipLines || payslipLines.length === 0) {
    return (
      <div className="px-5 pb-safe pt-6">
        {/* Header with back button - Consistent with Payslip History */}
        <header className="flex items-center mb-6">
          <Link to="/payslips" className="mr-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate" title="Kembali ke daftar slip gaji">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-navy">Detail Slip Gaji</h1>
            <p className="text-slate-light text-sm">Informasi detail slip gaji bulanan</p>
          </div>
        </header>

        <div className="text-center p-8 modern-card rounded-xl">
          <FilePlus className="w-12 h-12 text-red-500 mx-auto mb-4"/>
          <h3 className="text-xl font-semibold text-navy mb-2">Slip Gaji Tidak Ditemukan</h3>
          <p className="text-slate mb-4">Slip gaji yang Anda cari tidak dapat ditemukan.</p>
          <Link to="/payslips">
            <button className="bg-teal text-white px-4 py-2 rounded-lg flex items-center justify-center mx-auto shadow-sm hover:bg-teal/80 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Daftar Slip Gaji
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pb-safe pt-6">
      {/* Header with back button - Consistent with Payslip History */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/payslips" className="mr-4">
            <button className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate" title="Kembali ke daftar slip gaji">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-navy">Detail Slip Gaji</h1>
            <p className="text-slate-light text-sm">Informasi detail slip gaji bulanan</p>
          </div>
        </div>
        <button 
          onClick={async () => {
            if (payslip && payslipLines.length > 0) {
              try {
                const pdfDataUri = await generatePayslipPdf(payslip, payslipLines, companyData);
                const downloadLink = document.createElement('a');
                downloadLink.href = pdfDataUri;
                downloadLink.download = `Slip-Gaji-${payslip.name.replace(/\s+/g, '-')}.pdf`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
              } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Maaf, terjadi kesalahan saat membuat PDF. Silakan coba lagi.');
              }
            }
          }}
          className="bg-teal text-white px-3 py-2 rounded-lg flex items-center shadow-sm hover:bg-teal/80 transition-colors"
          title="Unduh PDF slip gaji"
        >
          <FileDown className="w-4 h-4 mr-2" />
          <span className="text-sm">Unduh PDF</span>
        </button>
      </header>

      <div className="modern-card p-4 mb-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold text-navy mb-4">{payslip.name}</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-slate-light">Periode</p>
            <p className="font-medium text-navy">
              {formatDate(payslip.date_from)} - {formatDate(payslip.date_to)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-light">Status</p>
            <p className="font-medium text-navy capitalize">{payslip.state}</p>
          </div>
          <div>
            <p className="text-sm text-slate-light">Nomor Slip</p>
            <p className="font-medium text-navy">{payslip.number}</p>
          </div>
          <div>
            <p className="text-sm text-slate-light">Gaji Bersih</p>
            <p className="font-medium text-teal font-bold">
              {formatCurrency(payslip.net_wage)}
            </p>
          </div>
        </div>
      </div>

      {/* Earnings / Additions Section */}
      {additions.length > 0 && (
        <div className="modern-card p-4 mb-6 rounded-xl shadow-sm">
          <h3 className="text-md font-bold text-navy mb-3 flex items-center">
            <DollarSign className="w-5 h-5 mr-1 text-teal" />
            Penghasilan
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-slate-light text-sm">Komponen</th>
                  <th className="text-right py-2 text-slate-light text-sm">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {additions.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-3 text-navy">{line.name}</td>
                    <td className="py-3 text-right text-teal font-medium">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-50">
                  <td className="py-3 text-navy">Total Penghasilan</td>
                  <td className="py-3 text-right text-teal">
                    {formatCurrency(totalAdditions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deductions Section */}
      {deductions.length > 0 && (
        <div className="modern-card p-4 mb-6 rounded-xl shadow-sm">
          <h3 className="text-md font-bold text-navy mb-3 flex items-center">
            <Tag className="w-5 h-5 mr-1 text-red-500" />
            Potongan
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-slate-light text-sm">Komponen</th>
                  <th className="text-right py-2 text-slate-light text-sm">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {deductions.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-3 text-navy">{line.name}</td>
                    <td className="py-3 text-right text-red-500 font-medium">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-50">
                  <td className="py-3 text-navy">Total Potongan</td>
                  <td className="py-3 text-right text-red-500">
                    {formatCurrency(totalDeductions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Company Contributions Section */}
      {contributions.length > 0 && (
        <div className="modern-card p-4 mb-6 rounded-xl shadow-sm">
          <h3 className="text-md font-bold text-navy mb-3 flex items-center">
            <DollarSign className="w-5 h-5 mr-1 text-teal" />
            Kontribusi Perusahaan
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-slate-light text-sm">Komponen</th>
                  <th className="text-right py-2 text-slate-light text-sm">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-3 text-navy">{line.name}</td>
                    <td className="py-3 text-right text-teal font-medium">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-50">
                  <td className="py-3 text-navy">Total Kontribusi</td>
                  <td className="py-3 text-right text-teal">
                    {formatCurrency(totalContributions)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Net Salary Summary */}
      <div className="modern-card p-4 rounded-xl shadow-sm bg-gradient-to-r from-teal/10 to-navy/10">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-navy">Gaji Bersih</h3>
          <p className="text-xl font-bold text-teal">
            {formatCurrency(payslip.net_wage)}
          </p>
        </div>
      </div>
    </div>
  );
}