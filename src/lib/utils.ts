import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fungsi untuk konversi string UTC dari Odoo ke Date lokal (UTC+7)
export function convertUTCtoJakartaTime(dateStr: string | Date): Date {
  // Hanya konversi jika dateStr berasal dari API (string), jika Date objek, asumsikan sudah lokal
  if (typeof dateStr === 'string') {
    const date = new Date(dateStr);
    // Tambahkan +7 jam untuk timezone Jakarta (WIB)
    return new Date(date.getTime() + (7 * 60 * 60 * 1000));
  }
  // Jika langsung menggunakan Date objek, kita asumsikan sudah dalam waktu lokal
  return new Date(dateStr);
}

export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '-';
  
  try {
    const jakartaTime = convertUTCtoJakartaTime(dateStr);
    return jakartaTime.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

export function formatFullDate(dateStr: string | Date): string {
  const jakartaTime = convertUTCtoJakartaTime(dateStr);
  return jakartaTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(timeStr: string | Date): string {
  const jakartaTime = convertUTCtoJakartaTime(timeStr);
  return jakartaTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function calculateDuration(startTime: Date, endTime: Date | null = null): string {
  // Konversi waktu UTC ke Jakarta (WIB)
  const startTimeWIB = convertUTCtoJakartaTime(startTime);
  
  // Jika endTime tidak ada, gunakan waktu sekarang
  const endTimeWIB = endTime ? convertUTCtoJakartaTime(endTime) : new Date();
  
  const diffMs = endTimeWIB.getTime() - startTimeWIB.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // Jika kurang dari 1 jam, tampilkan hanya dalam menit
  if (diffHrs === 0) {
    return `${diffMins}m`;
  }
  
  return `${diffHrs}h ${diffMins}m`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function formatMonth(dateStr: string | Date): string {
  const date = convertUTCtoJakartaTime(dateStr);
  return date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
}
