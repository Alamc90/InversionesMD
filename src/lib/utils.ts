import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number | string) => {
    if (!value) return '';
    return Number(value).toLocaleString('es-DO', { maximumFractionDigits: 0 });
};

export const parseCurrency = (value: string) => {
    return Number(value.replace(/[^0-9]/g, ''));
};
