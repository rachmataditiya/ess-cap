import { useState } from "react";
import { Link } from "wouter";
import { NeumorphicCard } from "@/components/ui/neumorphic";
import { usePayslips, usePayslipDetails } from "@/hooks/useOdoo";
import { formatCurrency, formatDate, formatMonth } from "@/lib/utils";
import { ArrowLeftIcon, FilterIcon, BanknoteIcon, ReceiptIcon } from "lucide-react";

export default function PayslipsHistory() {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [limit, setLimit] = useState(50); // Menampilkan 50 slip gaji
  const { data: payslips, isLoading } = usePayslips(limit);
  const [selectedPayslip, setSelectedPayslip] = useState<number | null>(null);
  const { data: payslipDetails, isLoading: isDetailsLoading } = usePayslipDetails(selectedPayslip || 0);
  // PDF download functionality telah dipindahkan ke halaman detail
  
  const years = [
    { value: 'all', label: 'All Years' },
    { value: '2025', label: '2025' },
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' },
  ];
  
  // Filter payslips based on selected year
  const filteredPayslips = payslips?.filter((record) => {
    if (selectedYear === 'all') return true;
    
    const recordDate = new Date(record.date_from);
    const recordYear = recordDate.getFullYear().toString();
    return recordYear === selectedYear;
  });
  
  return (
    <div className="px-5 pb-20 pt-6">
      {/* Header with back button - Similar to Calendar */}
      <header className="flex items-center mb-6">
        <Link to="/payslips" className="mr-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full modern-card-inset text-slate">
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Payslip History</h1>
          <p className="text-slate-light text-sm">View and manage your salary statements</p>
        </div>
      </header>
      
      {/* Filter Dropdown */}
      <div className="mb-6">
        <div className="relative flex items-center w-full modern-card-inset rounded-xl px-4 py-3.5">
          <BanknoteIcon className="text-teal w-5 h-5 mr-3" />
          <select 
            className="appearance-none bg-transparent flex-1 text-navy focus:outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            {years.map(year => (
              <option key={year.value} value={year.value}>{year.label}</option>
            ))}
          </select>
          <FilterIcon className="w-5 h-5 text-slate" />
        </div>
      </div>
      
      {/* Summary Card */}
      <NeumorphicCard className="p-5 mb-6 bg-gradient-to-r from-teal/90 to-teal">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-full bg-soft-white/20 flex items-center justify-center mr-4">
            <BanknoteIcon className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-soft-white text-lg font-medium">Total Income</h3>
            <p className="text-soft-white/70">
              {selectedYear === 'all' 
                ? 'All time'
                : `${selectedYear}`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-white">
              {filteredPayslips && formatCurrency(filteredPayslips.reduce((total, payslip) => {
                return total + (payslip.net_wage || 0);
              }, 0))}
            </span>
            <div className="text-white/80 text-sm">
              {filteredPayslips?.length || 0} payslips
            </div>
          </div>
        </div>
      </NeumorphicCard>
      
      {/* Payslips List */}
      <div>
        <h2 className="text-xl font-semibold text-navy mb-4">Payslip Records</h2>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
              <div className="loading-wave bg-teal"></div>
            </div>
          </div>
        ) : filteredPayslips && filteredPayslips.length > 0 ? (
          <div className="space-y-6">
            {filteredPayslips.map((payslip, index) => (
              <Link key={index} to={`/payslips/${payslip.id}`} className="block mb-6">
                <NeumorphicCard className="p-5 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-navy font-medium">
                      {formatMonth(payslip.date_from)}
                    </h4>
                    <div className={`bg-teal/10 text-teal text-xs px-2 py-1 rounded-full font-medium ${
                      payslip.state === 'done' ? 'bg-green-100 text-green-700' :
                      payslip.state === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                      payslip.state === 'cancel' ? 'bg-red-100 text-red-700' :
                      'bg-teal/10 text-teal'
                    }`}>
                      {payslip.state === 'done' ? 'Paid' :
                       payslip.state === 'draft' ? 'Draft' :
                       payslip.state === 'cancel' ? 'Cancelled' : 
                       'Processing'}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-slate text-sm mb-3">
                    <BanknoteIcon className="w-4 h-4 mr-2 text-slate-light" />
                    <span className="text-teal font-medium">{formatCurrency(payslip.net_wage || 0)}</span>
                  </div>
                  
                  <div className="flex items-center text-slate text-sm">
                    <ReceiptIcon className="w-4 h-4 mr-2 text-slate-light" />
                    <span>{formatDate(payslip.date_to)}</span>
                  </div>
                </NeumorphicCard>
              </Link>
            ))}
          </div>
        ) : (
          <NeumorphicCard className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <ReceiptIcon className="w-12 h-12 text-slate-light mb-4" />
              <h3 className="text-navy font-medium mb-2">No payslips found</h3>
              <p className="text-slate text-sm mb-4">
                {selectedYear !== 'all' 
                  ? `No payslips available for ${selectedYear}`
                  : 'No payslips available at this time'}
              </p>
              {selectedYear !== 'all' && (
                <button 
                  onClick={() => setSelectedYear('all')}
                  className="text-teal px-4 py-2 text-sm"
                >
                  View All Years
                </button>
              )}
            </div>
          </NeumorphicCard>
        )}
      </div>
    </div>
  );
}