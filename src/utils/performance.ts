import { useMemo } from 'react';

// Utility function to debounce user input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Utility function to throttle function calls
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Hook to create stable sort comparator functions
export function useSortComparator<T>(
  sortField: keyof T,
  sortDirection: 'asc' | 'desc'
) {
  return useMemo(() => {
    return (a: T, b: T) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    };
  }, [sortField, sortDirection]);
}

// Memoized field grouping by section
export function useGroupedFields<T extends { section_id: string }>(fields: T[]) {
  return useMemo(() => {
    const grouped = new Map<string, T[]>();
    fields.forEach(field => {
      const sectionFields = grouped.get(field.section_id) || [];
      sectionFields.push(field);
      grouped.set(field.section_id, sectionFields);
    });
    return grouped;
  }, [fields]);
}

// Performance monitoring utility
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static start(label: string) {
    this.measurements.set(label, performance.now());
  }

  static end(label: string) {
    const start = this.measurements.get(label);
    if (start) {
      const duration = performance.now() - start;
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      this.measurements.delete(label);
      return duration;
    }
    return 0;
  }
}

// Utility to check if object is equal (shallow comparison)
export function shallowEqual(obj1: any, obj2: any): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) {
    return false;
  }
  
  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  
  return true;
}