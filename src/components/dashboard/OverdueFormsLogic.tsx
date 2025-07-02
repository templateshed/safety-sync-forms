
import { supabase } from '@/integrations/supabase/client';
import { format, isToday, isPast, isFuture, addDays, startOfDay, endOfDay, differenceInDays, isAfter, isBefore } from 'date-fns';
import { isBusinessDay, getNextBusinessDay, getPreviousBusinessDay, calculateBusinessDaysBetween, BusinessDaysConfig, DEFAULT_BUSINESS_DAYS } from '@/utils/businessDays';

interface Form {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  schedule_start_date?: string;
  schedule_end_date?: string;
  schedule_type?: string;
  schedule_time?: string;
  schedule_timezone?: string;
  business_days_only?: boolean;
  business_days?: number[];
  exclude_holidays?: boolean;
  holiday_calendar?: string;
}

export interface OverdueForm extends Form {
  category: 'today' | 'past';
  daysOverdue: number;
  reason: string;
  businessDaysConfig?: BusinessDaysConfig;
}

export interface OverdueStats {
  overdueToday: number;
  pastDue: number;
  totalOverdue: number;
}

const getBusinessDaysConfig = (form: Form): BusinessDaysConfig => {
  return {
    businessDaysOnly: form.business_days_only || false,
    businessDays: form.business_days || DEFAULT_BUSINESS_DAYS,
    excludeHolidays: form.exclude_holidays || false,
    holidayCalendar: form.holiday_calendar || 'US',
  };
};

const getScheduledDateTime = (form: Form, targetDate: Date): Date => {
  const scheduleDate = form.schedule_start_date ? new Date(form.schedule_start_date) : targetDate;
  const scheduleTime = form.schedule_time || '09:00:00';
  
  const [hours, minutes, seconds] = scheduleTime.split(':').map(Number);
  const scheduledDateTime = new Date(targetDate);
  scheduledDateTime.setHours(hours, minutes, seconds || 0, 0);
  
  return scheduledDateTime;
};

const hasResponseForDate = (responses: any[], formId: string, targetDate: Date): boolean => {
  const targetStart = startOfDay(targetDate);
  const targetEnd = endOfDay(targetDate);
  
  return responses.some(response => {
    if (response.form_id !== formId) return false;
    const responseDate = new Date(response.submitted_at);
    return responseDate >= targetStart && responseDate <= targetEnd;
  });
};

const calculateDaysOverdue = (form: Form, now: Date): number => {
  const scheduleType = form.schedule_type || 'one_time';
  const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
  const businessDaysConfig = getBusinessDaysConfig(form);
  
  if (!startDate) return 0;
  
  switch (scheduleType) {
    case 'daily': {
      const todayScheduledTime = getScheduledDateTime(form, now);
      if (isAfter(now, todayScheduledTime)) {
        if (businessDaysConfig.businessDaysOnly) {
          return calculateBusinessDaysBetween(startOfDay(startDate), now, businessDaysConfig);
        } else {
          return Math.max(1, differenceInDays(now, startOfDay(startDate)));
        }
      }
      return 0;
    }
    case 'one_time': {
      const scheduledTime = getScheduledDateTime(form, startDate);
      if (isAfter(now, scheduledTime)) {
        if (businessDaysConfig.businessDaysOnly) {
          return calculateBusinessDaysBetween(startOfDay(startDate), now, businessDaysConfig);
        } else {
          return Math.max(1, differenceInDays(now, startOfDay(startDate)));
        }
      }
      return 0;
    }
    case 'weekly':
    case 'monthly': {
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      if (endDate && isPast(endDate)) {
        if (businessDaysConfig.businessDaysOnly) {
          return calculateBusinessDaysBetween(endDate, now, businessDaysConfig);
        } else {
          return Math.max(1, differenceInDays(now, endDate));
        }
      }
      return 0;
    }
    default:
      return 0;
  }
};

const getOverdueReason = (form: Form, now: Date, category: 'today' | 'past'): string => {
  const scheduleType = form.schedule_type || 'one_time';
  const scheduleTime = form.schedule_time || '09:00:00';
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const businessDaysConfig = getBusinessDaysConfig(form);
  const businessDaysText = businessDaysConfig.businessDaysOnly ? ' (business days)' : '';
  
  if (category === 'today') {
    switch (scheduleType) {
      case 'daily':
        return `Due at ${timeString}${businessDaysText} - No response today`;
      case 'one_time':
        return `Scheduled for ${timeString}${businessDaysText} - Not completed`;
      default:
        return `Due today${businessDaysText} - Not completed`;
    }
  } else {
    switch (scheduleType) {
      case 'daily':
        return `Missing responses from previous days${businessDaysText}`;
      case 'one_time':
        return `Was due ${form.schedule_start_date ? format(new Date(form.schedule_start_date), 'MMM d, yyyy') : ''}${businessDaysText}`;
      case 'weekly':
      case 'monthly':
        return `Ended ${form.schedule_end_date ? format(new Date(form.schedule_end_date), 'MMM d, yyyy') : ''}${businessDaysText}`;
      default:
        return `Past due${businessDaysText}`;
    }
  }
};

export const categorizeOverdueForms = async (formsData: Form[]): Promise<{
  categorizedForms: OverdueForm[];
  stats: OverdueStats;
}> => {
  const now = new Date();
  
  // Get all responses for overdue calculation
  const { data: allResponses } = await supabase
    .rpc('get_form_responses_with_user_data');
  
  const categorizedForms: OverdueForm[] = [];
  
  for (const form of formsData) {
    if (form.status !== 'published') continue;
    
    const scheduleType = form.schedule_type || 'one_time';
    const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
    const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
    const businessDaysConfig = getBusinessDaysConfig(form);
    
    if (!startDate) continue;
    if (isFuture(startDate)) continue;
    
    let isOverdueToday = false;
    let isPastDue = false;
    
    switch (scheduleType) {
      case 'daily': {
        const todayScheduledTime = getScheduledDateTime(form, now);
        
        // Check if overdue today (consider business days)
        if (isAfter(now, todayScheduledTime)) {
          const shouldCheckToday = businessDaysConfig.businessDaysOnly ? 
            isBusinessDay(now, businessDaysConfig) : true;
            
          if (shouldCheckToday) {
            const hasResponseToday = hasResponseForDate(allResponses || [], form.id, now);
            if (!hasResponseToday) {
              isOverdueToday = true;
            }
          }
        }
        
        // Check for past due (missing responses from previous days)
        if (endDate && isPast(endDate)) {
          const hasAnyResponses = (allResponses || []).some(response => {
            if (response.form_id !== form.id) return false;
            const responseDate = new Date(response.submitted_at);
            return responseDate >= startDate && responseDate <= endDate;
          });
          if (!hasAnyResponses) {
            isPastDue = true;
          }
        } else {
          // Check for missing responses on previous days since start
          let currentDate = new Date(startDate);
          const today = startOfDay(now);
          
          while (currentDate < today) {
            const shouldCheckDay = businessDaysConfig.businessDaysOnly ? 
              isBusinessDay(currentDate, businessDaysConfig) : true;
              
            if (shouldCheckDay) {
              const scheduledTime = getScheduledDateTime(form, currentDate);
              
              if (isBefore(scheduledTime, now)) {
                const hasResponseForDay = hasResponseForDate(allResponses || [], form.id, currentDate);
                if (!hasResponseForDay) {
                  isPastDue = true;
                  break;
                }
              }
            }
            
            currentDate = addDays(currentDate, 1);
          }
        }
        break;
      }
      
      case 'weekly':
      case 'monthly': {
        isPastDue = endDate ? isPast(endDate) : false;
        break;
      }
      
      case 'one_time':
      default: {
        const scheduledTime = getScheduledDateTime(form, startDate);
        const hasAnyResponse = (allResponses || []).some(response => response.form_id === form.id);
        
        if (isAfter(now, scheduledTime) && !hasAnyResponse) {
          const shouldCheck = businessDaysConfig.businessDaysOnly ? 
            isBusinessDay(startDate, businessDaysConfig) : true;
            
          if (shouldCheck) {
            if (isToday(startDate)) {
              isOverdueToday = true;
            } else {
              isPastDue = true;
            }
          }
        }
        break;
      }
    }
    
    // Add form to "Overdue Today" category if applicable
    if (isOverdueToday) {
      const daysOverdue = calculateDaysOverdue(form, now);
      const reason = getOverdueReason(form, now, 'today');
      
      categorizedForms.push({
        ...form,
        category: 'today',
        daysOverdue,
        reason,
        businessDaysConfig,
      });
    }
    
    // Add form to "Past Due" category if applicable (can be in addition to "Overdue Today")
    if (isPastDue) {
      const daysOverdue = calculateDaysOverdue(form, now);
      const reason = getOverdueReason(form, now, 'past');
      
      categorizedForms.push({
        ...form,
        category: 'past',
        daysOverdue,
        reason,
        businessDaysConfig,
      });
    }
  }
  
  const overdueToday = categorizedForms.filter(f => f.category === 'today').length;
  const pastDue = categorizedForms.filter(f => f.category === 'past').length;
  
  // Calculate unique forms for total overdue (forms that appear in both categories should only be counted once)
  const uniqueOverdueForms = new Set(categorizedForms.map(f => f.id));
  
  return {
    categorizedForms,
    stats: {
      overdueToday,
      pastDue,
      totalOverdue: uniqueOverdueForms.size,
    }
  };
};
