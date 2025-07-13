
import { addDays, isWeekend, format, startOfDay } from 'date-fns';

export interface BusinessDaysConfig {
  businessDaysOnly: boolean;
  businessDays: number[]; // 1=Monday, 2=Tuesday, ..., 5=Friday
  excludeHolidays: boolean;
  holidayCalendar?: string;
}

// Default business days configuration (Monday to Friday)
export const DEFAULT_BUSINESS_DAYS = [1, 2, 3, 4, 5];

/**
 * Check if a date is a business day based on configuration
 */
export const isBusinessDay = (date: Date, config: BusinessDaysConfig): boolean => {
  console.log('isBusinessDay called:', {
    date: date.toISOString(),
    dayOfWeek: date.getDay(),
    config: config,
    businessDaysArray: config.businessDays,
    businessDaysOnly: config.businessDaysOnly
  });
  
  if (!config.businessDaysOnly) {
    return true; // All days are considered if not business days only
  }

  const dayOfWeek = date.getDay();
  // Convert Sunday=0 to Monday=1 system
  const businessDayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;
  
  console.log('Business day calculation:', {
    dayOfWeek,
    businessDayNumber,
    businessDaysArray: config.businessDays,
    includes: config.businessDays.includes(businessDayNumber),
    businessDaysType: typeof config.businessDays,
    isArray: Array.isArray(config.businessDays)
  });
  
  return config.businessDays.includes(businessDayNumber);
};

/**
 * Get the next business day from a given date
 */
export const getNextBusinessDay = (date: Date, config: BusinessDaysConfig): Date => {
  if (!config.businessDaysOnly) {
    return addDays(date, 1);
  }

  let nextDay = addDays(date, 1);
  let attempts = 0;
  
  while (!isBusinessDay(nextDay, config) && attempts < 14) {
    nextDay = addDays(nextDay, 1);
    attempts++;
  }
  
  return nextDay;
};

/**
 * Get the previous business day from a given date
 */
export const getPreviousBusinessDay = (date: Date, config: BusinessDaysConfig): Date => {
  if (!config.businessDaysOnly) {
    return addDays(date, -1);
  }

  let prevDay = addDays(date, -1);
  let attempts = 0;
  
  while (!isBusinessDay(prevDay, config) && attempts < 14) {
    prevDay = addDays(prevDay, -1);
    attempts++;
  }
  
  return prevDay;
};

/**
 * Calculate business days between two dates
 */
export const calculateBusinessDaysBetween = (startDate: Date, endDate: Date, config: BusinessDaysConfig): number => {
  if (!config.businessDaysOnly) {
    // If not business days only, return calendar days
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  let count = 0;
  let currentDate = startOfDay(startDate);
  const endDateStart = startOfDay(endDate);
  
  while (currentDate < endDateStart) {
    if (isBusinessDay(currentDate, config)) {
      count++;
    }
    currentDate = addDays(currentDate, 1);
  }
  
  return count;
};

/**
 * Add business days to a date
 */
export const addBusinessDays = (date: Date, daysToAdd: number, config: BusinessDaysConfig): Date => {
  if (!config.businessDaysOnly) {
    return addDays(date, daysToAdd);
  }

  let currentDate = new Date(date);
  let addedDays = 0;
  
  while (addedDays < daysToAdd) {
    currentDate = addDays(currentDate, 1);
    if (isBusinessDay(currentDate, config)) {
      addedDays++;
    }
  }
  
  return currentDate;
};

/**
 * Format business days configuration for display
 */
export const formatBusinessDaysConfig = (config: BusinessDaysConfig): string => {
  if (!config.businessDaysOnly) {
    return 'All days';
  }

  const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const selectedDays = config.businessDays.map(day => dayNames[day]).join(', ');
  
  return `Business days: ${selectedDays}`;
};

/**
 * Check if current time is within business hours for a form
 */
export const isWithinBusinessDay = (date: Date, config: BusinessDaysConfig): boolean => {
  return isBusinessDay(date, config);
};
