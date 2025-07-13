import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, FileText, Users, TrendingUp, Clock, AlertTriangle, CheckCircle, Briefcase, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isPast, isFuture, addDays, startOfDay, endOfDay, differenceInDays, parseISO, isAfter, isBefore, isSameDay, subDays } from 'date-fns';
import { isBusinessDay, BusinessDaysConfig, DEFAULT_BUSINESS_DAYS } from '@/utils/businessDays';
import { Json } from '@/integrations/supabase/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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

interface FormResponse {
  id: string;
  form_id: string;
  submitted_at: string;
  form_title?: string;
}

interface DashboardStats {
  totalForms: number;
  publishedForms: number;
  totalResponses: number;
  formsToday: number;
  overdueToday: number;
  pastDue: number;
}

// Helper function to transform database form data to component Form type
const transformFormData = (dbForm: any): Form => {
  return {
    ...dbForm,
    business_days: Array.isArray(dbForm.business_days) 
      ? dbForm.business_days 
      : dbForm.business_days 
        ? (Array.isArray(dbForm.business_days) ? dbForm.business_days : DEFAULT_BUSINESS_DAYS)
        : DEFAULT_BUSINESS_DAYS,
  };
};

export const DashboardOverview = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [recentResponses, setRecentResponses] = useState<FormResponse[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    publishedForms: 0,
    totalResponses: 0,
    formsToday: 0,
    overdueToday: 0,
    pastDue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [clearedFormInstances, setClearedFormInstances] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      loadClearedFormInstances();
    }
  }, [user]);

  const getBusinessDaysConfig = (form: Form): BusinessDaysConfig => {
    return {
      businessDaysOnly: form.business_days_only || false,
      businessDays: form.business_days || DEFAULT_BUSINESS_DAYS,
      excludeHolidays: form.exclude_holidays || false,
      holidayCalendar: form.holiday_calendar || 'US',
    };
  };

  const calculateFormsOverdueToday = (formsData: Form[]): number => {
    const now = new Date();
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    return formsData.filter(form => {
      if (form.status !== 'published') return false;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      const businessDaysConfig = getBusinessDaysConfig(form);
      
      if (!startDate) return false;
      if (endDate && isPast(endDate)) return false;
      
      // Check if today is a business day for this form (if business days only is enabled)
      if (businessDaysConfig.businessDaysOnly && !isBusinessDay(today, businessDaysConfig)) {
        return false;
      }
      
      // Check if form was due today but is now overdue
      switch (scheduleType) {
        case 'daily': {
          const isDayActive = startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          return isAfter(now, todayScheduledTime);
        }
        case 'weekly': {
          const dayOfWeek = today.getDay();
          const weeklyStartDay = startDate.getDay();
          const isDayActive = dayOfWeek === weeklyStartDay && startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          return isAfter(now, todayScheduledTime);
        }
        case 'monthly': {
          const dayOfMonth = today.getDate();
          const monthlyStartDayOfMonth = startDate.getDate();
          const isDayActive = dayOfMonth === monthlyStartDayOfMonth && startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          return isAfter(now, todayScheduledTime);
        }
        case 'one_time':
        default: {
          const isStartDateToday = isToday(startDate);
          if (!isStartDateToday) return false;
          
          const scheduledTime = getScheduledDateTime(form, startDate);
          return isAfter(now, scheduledTime);
        }
      }
    }).length;
  };

  // Helper function to generate unique keys for form instances (form ID + date)
  const generateFormInstanceKey = (formId: string, date: Date): string => {
    return `${formId}-${format(date, 'yyyy-MM-dd')}`;
  };

  const calculateFormsPastDue = (formsData: Form[]): number => {
    const today = new Date();
    const todayStart = startOfDay(today);
    
    let totalPastDue = 0;
    
    formsData.forEach(form => {
      if (form.status !== 'published') return;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      const businessDaysConfig = getBusinessDaysConfig(form);
      
      if (!startDate) return;
      if (endDate && isPast(endDate)) return;
      
      // Count actual missed form instances (not just forms with missed days)
      switch (scheduleType) {
        case 'daily': {
          // For daily forms, count each missed day as a separate missed form
          const daysSinceStart = differenceInDays(today, startDate);
          if (daysSinceStart <= 0) return;
          
          // Count each missed business day or regular day as a separate missed form instance
          for (let i = 1; i <= daysSinceStart; i++) {
            const pastDate = addDays(startDate, i);
            const instanceKey = generateFormInstanceKey(form.id, pastDate);
            
            // Skip if this instance has been cleared
            if (clearedFormInstances.has(instanceKey)) continue;
            
            if (businessDaysConfig.businessDaysOnly) {
              if (isBusinessDay(pastDate, businessDaysConfig)) {
                totalPastDue++;
              }
            } else {
              totalPastDue++;
            }
          }
          break;
        }
        case 'weekly': {
          // For weekly forms, count each missed week as a separate missed form instance
          const weeksSinceStart = Math.floor(differenceInDays(today, startDate) / 7);
          for (let i = 1; i <= weeksSinceStart; i++) {
            const pastDate = addDays(startDate, i * 7);
            const instanceKey = generateFormInstanceKey(form.id, pastDate);
            
            // Skip if this instance has been cleared
            if (!clearedFormInstances.has(instanceKey)) {
              totalPastDue++;
            }
          }
          break;
        }
        case 'monthly': {
          // For monthly forms, count each missed month as a separate missed form instance
          const monthsSinceStart = today.getFullYear() * 12 + today.getMonth() - (startDate.getFullYear() * 12 + startDate.getMonth());
          for (let i = 1; i <= monthsSinceStart; i++) {
            const pastDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
            const instanceKey = generateFormInstanceKey(form.id, pastDate);
            
            // Skip if this instance has been cleared
            if (!clearedFormInstances.has(instanceKey)) {
              totalPastDue++;
            }
          }
          break;
        }
        case 'one_time':
        default: {
          // For one-time forms, check if the start date was in the past
          if (isBefore(startDate, todayStart)) {
            const instanceKey = generateFormInstanceKey(form.id, startDate);
            
            // Skip if this instance has been cleared
            if (!clearedFormInstances.has(instanceKey)) {
              totalPastDue++;
            }
          }
          break;
        }
      }
    });
    
    return totalPastDue;
  };

  const getScheduledDateTime = (form: Form, targetDate: Date): Date => {
    const scheduleDate = form.schedule_start_date ? new Date(form.schedule_start_date) : targetDate;
    const scheduleTime = form.schedule_time || '09:00:00';
    
    // Create a new date with the target date but the scheduled time
    const [hours, minutes, seconds] = scheduleTime.split(':').map(Number);
    const scheduledDateTime = new Date(targetDate);
    scheduledDateTime.setHours(hours, minutes, seconds || 0, 0);
    
    return scheduledDateTime;
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Fetching dashboard data...');

      // Fetch user's forms
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (formsError) throw formsError;

      // Fetch recent responses using the RPC function
      const { data: responsesData, error: responsesError } = await supabase
        .rpc('get_form_responses_with_user_data')
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (responsesError) throw responsesError;

      console.log('Forms data:', formsData);
      console.log('Responses data:', responsesData);

      // Transform the forms data to ensure proper typing
      const transformedForms = (formsData || []).map(transformFormData);
      setForms(transformedForms);
      
      // Transform the RPC response data to match FormResponse interface
      const transformedResponses: FormResponse[] = (responsesData || []).map(response => ({
        id: response.id,
        form_id: response.form_id,
        submitted_at: response.submitted_at,
        form_title: response.form_title,
      }));
      
      setRecentResponses(transformedResponses);

      // Calculate stats with improved logic
      const totalForms = formsData?.length || 0;
      const publishedForms = formsData?.filter(f => f.status === 'published').length || 0;
      const totalResponses = responsesData?.length || 0;

      // Calculate forms due today (considering business days)
      const formsToday = calculateFormsDueToday(transformedForms);
      console.log('Forms due today calculation:', formsToday);

      // Calculate overdue forms
      const overdueToday = calculateFormsOverdueToday(transformedForms);
      const pastDue = calculateFormsPastDue(transformedForms);
      const overdueStats = { overdueToday, pastDue };
      console.log('Overdue stats:', overdueStats);

      setStats({
        totalForms,
        publishedForms,
        totalResponses,
        formsToday,
        overdueToday: overdueStats.overdueToday,
        pastDue: overdueStats.pastDue,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateFormsDueToday = (formsData: Form[]): number => {
    const now = new Date();
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    return formsData.filter(form => {
      if (form.status !== 'published') return false;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      const businessDaysConfig = getBusinessDaysConfig(form);
      
      console.log(`Checking form "${form.title}":`, {
        scheduleType,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        today: today.toISOString(),
        now: now.toISOString(),
        businessDaysConfig
      });
      
      // If no start date, can't be due today
      if (!startDate) return false;
      
      // If end date has passed, form is no longer active
      if (endDate && isPast(endDate)) {
        console.log(`Form "${form.title}" is past end date`);
        return false;
      }
      
      // Check if today is a business day for this form (if business days only is enabled)
      if (businessDaysConfig.businessDaysOnly && !isBusinessDay(today, businessDaysConfig)) {
        console.log(`Form "${form.title}" not due today - not a business day`);
        return false;
      }
      
      switch (scheduleType) {
        case 'daily': {
          // For daily forms, check if today is within the active period AND not overdue
          const isDayActive = startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) {
            console.log(`Daily form "${form.title}" not active today`);
            return false;
          }
          
          // Check if the scheduled time for today has passed (form is overdue)
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          
          console.log(`Daily form "${form.title}":`, {
            isDayActive,
            todayScheduledTime: todayScheduledTime.toISOString(),
            isOverdue,
            dueToday: isDayActive && !isOverdue
          });
          
          return isDayActive && !isOverdue;
        }
          
        case 'weekly': {
          // For weekly forms, check if it's the right day of the week and within active period
          const dayOfWeek = today.getDay();
          const weeklyStartDay = startDate.getDay();
          const isDayActive = dayOfWeek === weeklyStartDay && 
                             startDate <= todayEnd && 
                             (!endDate || endDate >= todayStart);
          
          if (!isDayActive) {
            console.log(`Weekly form "${form.title}" not active today`);
            return false;
          }
          
          // Check if the scheduled time for today has passed (form is overdue)
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          
          console.log(`Weekly form "${form.title}":`, {
            isDayActive,
            todayScheduledTime: todayScheduledTime.toISOString(),
            isOverdue,
            dueToday: isDayActive && !isOverdue
          });
          
          return isDayActive && !isOverdue;
        }
          
        case 'monthly': {
          // For monthly forms, check if it's the same day of month and within active period
          const dayOfMonth = today.getDate();
          const monthlyStartDayOfMonth = startDate.getDate();
          const isDayActive = dayOfMonth === monthlyStartDayOfMonth && 
                              startDate <= todayEnd && 
                              (!endDate || endDate >= todayStart);
          
          if (!isDayActive) {
            console.log(`Monthly form "${form.title}" not active today`);
            return false;
          }
          
          // Check if the scheduled time for today has passed (form is overdue)
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          
          console.log(`Monthly form "${form.title}":`, {
            isDayActive,
            todayScheduledTime: todayScheduledTime.toISOString(),
            isOverdue,
            dueToday: isDayActive && !isOverdue
          });
          
          return isDayActive && !isOverdue;
        }
          
        case 'one_time':
        default: {
          // For one-time forms, check if start date is today AND not overdue
          const isStartDateToday = isToday(startDate);
          if (!isStartDateToday) {
            console.log(`One-time form "${form.title}" not scheduled for today`);
            return false;
          }
          
          // Check if the scheduled time has passed (form is overdue)
          const scheduledTime = getScheduledDateTime(form, startDate);
          const isOverdue = isAfter(now, scheduledTime);
          
          console.log(`One-time form "${form.title}":`, {
            isStartDateToday,
            scheduledTime: scheduledTime.toISOString(),
            isOverdue,
            dueToday: isStartDateToday && !isOverdue
          });
          
          return isStartDateToday && !isOverdue;
        }
      }
    }).length;
  };

  const handleClearOverdue = async () => {
    await fetchDashboardData();
    toast({
      title: "Success",
      description: "Overdue forms refreshed",
    });
  };

  const loadClearedFormInstances = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cleared_form_instances')
        .select('form_id, instance_date')
        .eq('user_id', user.id);

      if (error) throw error;

      const clearedSet = new Set<string>();
      data?.forEach(item => {
        const instanceKey = generateFormInstanceKey(item.form_id, new Date(item.instance_date));
        clearedSet.add(instanceKey);
      });

      setClearedFormInstances(clearedSet);
    } catch (error) {
      console.error('Error loading cleared form instances:', error);
    }
  };

  const saveClearedFormInstance = async (formId: string, instanceDate: Date) => {
    if (!user) return;
    
    try {
      await supabase
        .from('cleared_form_instances')
        .upsert({
          user_id: user.id,
          form_id: formId,
          instance_date: format(instanceDate, 'yyyy-MM-dd'),
        });
    } catch (error) {
      console.error('Error saving cleared form instance:', error);
    }
  };

  const handleClearPastDue = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to clear past due forms",
        variant: "destructive",
      });
      return;
    }

    try {
      // Generate all current past due form instance keys and save them to database
      const today = new Date();
      const todayStart = startOfDay(today);
      const newClearedInstances = new Set(clearedFormInstances);
      const instancesToSave: Array<{formId: string, date: Date}> = [];

      forms.forEach(form => {
        if (form.status !== 'published') return;
        
        const scheduleType = form.schedule_type || 'one_time';
        const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
        const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
        const businessDaysConfig = getBusinessDaysConfig(form);
        
        if (!startDate) return;
        if (endDate && isPast(endDate)) return;
        
        switch (scheduleType) {
          case 'daily': {
            const daysSinceStart = differenceInDays(today, startDate);
            if (daysSinceStart <= 0) return;
            
            for (let i = 1; i <= daysSinceStart; i++) {
              const pastDate = addDays(startDate, i);
              const instanceKey = generateFormInstanceKey(form.id, pastDate);
              
              if (!clearedFormInstances.has(instanceKey)) {
                if (businessDaysConfig.businessDaysOnly) {
                  if (isBusinessDay(pastDate, businessDaysConfig)) {
                    newClearedInstances.add(instanceKey);
                    instancesToSave.push({formId: form.id, date: pastDate});
                  }
                } else {
                  newClearedInstances.add(instanceKey);
                  instancesToSave.push({formId: form.id, date: pastDate});
                }
              }
            }
            break;
          }
          case 'weekly': {
            const weeksSinceStart = Math.floor(differenceInDays(today, startDate) / 7);
            for (let i = 1; i <= weeksSinceStart; i++) {
              const pastDate = addDays(startDate, i * 7);
              const instanceKey = generateFormInstanceKey(form.id, pastDate);
              if (!clearedFormInstances.has(instanceKey)) {
                newClearedInstances.add(instanceKey);
                instancesToSave.push({formId: form.id, date: pastDate});
              }
            }
            break;
          }
          case 'monthly': {
            const monthsSinceStart = today.getFullYear() * 12 + today.getMonth() - (startDate.getFullYear() * 12 + startDate.getMonth());
            for (let i = 1; i <= monthsSinceStart; i++) {
              const pastDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
              const instanceKey = generateFormInstanceKey(form.id, pastDate);
              if (!clearedFormInstances.has(instanceKey)) {
                newClearedInstances.add(instanceKey);
                instancesToSave.push({formId: form.id, date: pastDate});
              }
            }
            break;
          }
          case 'one_time':
          default: {
            if (isBefore(startDate, todayStart)) {
              const instanceKey = generateFormInstanceKey(form.id, startDate);
              if (!clearedFormInstances.has(instanceKey)) {
                newClearedInstances.add(instanceKey);
                instancesToSave.push({formId: form.id, date: startDate});
              }
            }
            break;
          }
        }
      });

      // Save all new cleared instances to database
      if (instancesToSave.length > 0) {
        const { error } = await supabase
          .from('cleared_form_instances')
          .upsert(
            instancesToSave.map(instance => ({
              user_id: user.id,
              form_id: instance.formId,
              instance_date: format(instance.date, 'yyyy-MM-dd'),
            }))
          );

        if (error) throw error;
      }

      // Update the cleared instances state
      setClearedFormInstances(newClearedInstances);
      
      // Recalculate stats
      await fetchDashboardData();

      toast({
        title: "Success", 
        description: "Past due forms cleared and saved permanently",
      });
    } catch (error) {
      console.error('Error clearing past due forms:', error);
      toast({
        title: "Error",
        description: "Failed to clear past due forms",
        variant: "destructive",
      });
    }
  };

  const getFormsDueToday = () => {
    const now = new Date();
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    return forms.filter(form => {
      if (form.status !== 'published') return false;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      const businessDaysConfig = getBusinessDaysConfig(form);
      
      if (!startDate) return false;
      if (endDate && isPast(endDate)) return false;
      
      // Check if today is a business day for this form (if business days only is enabled)
      if (businessDaysConfig.businessDaysOnly && !isBusinessDay(today, businessDaysConfig)) {
        return false;
      }
      
      switch (scheduleType) {
        case 'daily': {
          const isDayActive = startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          return isDayActive && !isOverdue;
        }
        case 'weekly': {
          const dayOfWeek = today.getDay();
          const weeklyStartDay = startDate.getDay();
          const isDayActive = dayOfWeek === weeklyStartDay && startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          return isDayActive && !isOverdue;
        }
        case 'monthly': {
          const dayOfMonth = today.getDate();
          const monthlyStartDayOfMonth = startDate.getDate();
          const isDayActive = dayOfMonth === monthlyStartDayOfMonth && startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          return isDayActive && !isOverdue;
        }
        case 'one_time':
        default: {
          const isStartDateToday = isToday(startDate);
          if (!isStartDateToday) return false;
          
          const scheduledTime = getScheduledDateTime(form, startDate);
          const isOverdue = isAfter(now, scheduledTime);
          return isStartDateToday && !isOverdue;
        }
      }
    });
  };

  const getFormsOverdueToday = () => {
    const now = new Date();
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    
    return forms.filter(form => {
      if (form.status !== 'published') return false;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      const businessDaysConfig = getBusinessDaysConfig(form);
      
      if (!startDate) return false;
      if (endDate && isPast(endDate)) return false;
      
      // Check if today is a business day for this form (if business days only is enabled)
      if (businessDaysConfig.businessDaysOnly && !isBusinessDay(today, businessDaysConfig)) {
        return false;
      }
      
      switch (scheduleType) {
        case 'daily': {
          const isDayActive = startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          return isDayActive && isOverdue;
        }
        case 'weekly': {
          const dayOfWeek = today.getDay();
          const weeklyStartDay = startDate.getDay();
          const isDayActive = dayOfWeek === weeklyStartDay && startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          return isDayActive && isOverdue;
        }
        case 'monthly': {
          const dayOfMonth = today.getDate();
          const monthlyStartDayOfMonth = startDate.getDate();
          const isDayActive = dayOfMonth === monthlyStartDayOfMonth && startDate <= todayEnd && (!endDate || endDate >= todayStart);
          if (!isDayActive) return false;
          
          const todayScheduledTime = getScheduledDateTime(form, today);
          const isOverdue = isAfter(now, todayScheduledTime);
          return isDayActive && isOverdue;
        }
        case 'one_time':
        default: {
          const isStartDateToday = isToday(startDate);
          if (!isStartDateToday) return false;
          
          const scheduledTime = getScheduledDateTime(form, startDate);
          const isOverdue = isAfter(now, scheduledTime);
          return isStartDateToday && isOverdue;
        }
      }
    });
  };

  const getMissedFormsForDate = (targetDate: Date) => {
    const targetStart = startOfDay(targetDate);
    const targetEnd = endOfDay(targetDate);
    
    return forms.filter(form => {
      if (form.status !== 'published') return false;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      const businessDaysConfig = getBusinessDaysConfig(form);
      
      if (!startDate) return false;
      if (endDate && isBefore(endDate, targetStart)) return false;
      if (isAfter(startDate, targetEnd)) return false;
      
      // Check if this form instance has been cleared
      const instanceKey = generateFormInstanceKey(form.id, targetDate);
      if (clearedFormInstances.has(instanceKey)) return false;
      
      // Check if target date is a business day for this form (if business days only is enabled)
      if (businessDaysConfig.businessDaysOnly && !isBusinessDay(targetDate, businessDaysConfig)) {
        return false;
      }
      
      switch (scheduleType) {
        case 'daily': {
          // For daily forms, check if the target date was within the active period
          const isDayActive = startDate <= targetEnd && (!endDate || endDate >= targetStart);
          return isDayActive && isBefore(targetDate, startOfDay(new Date()));
        }
        case 'weekly': {
          // For weekly forms, check if target date matches the weekly schedule
          const dayOfWeek = targetDate.getDay();
          const weeklyStartDay = startDate.getDay();
          const isDayActive = dayOfWeek === weeklyStartDay && startDate <= targetEnd && (!endDate || endDate >= targetStart);
          return isDayActive && isBefore(targetDate, startOfDay(new Date()));
        }
        case 'monthly': {
          // For monthly forms, check if target date matches the monthly schedule
          const dayOfMonth = targetDate.getDate();
          const monthlyStartDayOfMonth = startDate.getDate();
          const isDayActive = dayOfMonth === monthlyStartDayOfMonth && startDate <= targetEnd && (!endDate || endDate >= targetStart);
          return isDayActive && isBefore(targetDate, startOfDay(new Date()));
        }
        case 'one_time':
        default: {
          // For one-time forms, check if target date is the start date and it's in the past
          return isSameDay(startDate, targetDate) && isBefore(targetDate, startOfDay(new Date()));
        }
      }
    });
  };

  const hasMissedFormsOnDate = (date: Date) => {
    return getMissedFormsForDate(date).length > 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formsDueToday = getFormsDueToday();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your forms and recent activity
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Forms</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalForms}</div>
            <p className="text-xs text-muted-foreground">
              {stats.publishedForms} published
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalResponses}</div>
            <p className="text-xs text-muted-foreground">
              All time responses
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Due Today</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.formsToday}</div>
            <p className="text-xs text-muted-foreground">
              Forms scheduled for today
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Overdue Today</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.overdueToday}</div>
            <p className="text-xs text-muted-foreground">
              Forms overdue today
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Past Due</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.pastDue}</div>
            <p className="text-xs text-muted-foreground">
              Forms past due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forms Due Today - Full Width */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <CalendarDays className="h-5 w-5 mr-2" />
            Forms Due Today ({formsDueToday.length})
          </CardTitle>
          <CardDescription>Forms scheduled to be active today</CardDescription>
        </CardHeader>
        <CardContent>
          {formsDueToday.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Form</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formsDueToday.map((form) => {
                    const businessDaysConfig = getBusinessDaysConfig(form);
                    return (
                      <TableRow key={form.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground">{form.title}</h4>
                              {businessDaysConfig.businessDaysOnly && (
                                <Briefcase className="h-3 w-3 text-blue-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {form.schedule_type === 'daily' ? `Due at ${form.schedule_time || '09:00'}` : 
                               form.schedule_type === 'weekly' ? 'Weekly form' :
                               form.schedule_type === 'monthly' ? 'Monthly form' :
                               form.schedule_start_date ? format(new Date(form.schedule_start_date), 'h:mm a') : 'One-time form'}
                              {businessDaysConfig.businessDaysOnly ? ' (biz days)' : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize text-muted-foreground">
                            {form.schedule_type?.replace('_', ' ') || 'One-time'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
                            {form.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No forms due today</p>
          )}
        </CardContent>
      </Card>

      {/* Forms Overdue Today */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-500" />
              Forms Overdue Today ({getFormsOverdueToday().length})
            </div>
            {getFormsOverdueToday().length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearOverdue}>
                Clear Overdue
              </Button>
            )}
          </CardTitle>
          <CardDescription>Forms that were due today but passed their scheduled time</CardDescription>
        </CardHeader>
        <CardContent>
          {getFormsOverdueToday().length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Form</TableHead>
                    <TableHead className="font-medium">Scheduled Time</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFormsOverdueToday().map((form) => {
                    const businessDaysConfig = getBusinessDaysConfig(form);
                    const scheduledTime = getScheduledDateTime(form, new Date());
                    return (
                      <TableRow key={form.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-foreground">{form.title}</h4>
                              {businessDaysConfig.businessDaysOnly && (
                                <Briefcase className="h-3 w-3 text-blue-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {form.schedule_type?.replace('_', ' ') || 'One-time'} form
                              {businessDaysConfig.businessDaysOnly ? ' (business days only)' : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-orange-600 font-medium">
                            {format(scheduledTime, 'h:mm a')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            Overdue
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No forms overdue today</p>
          )}
        </CardContent>
      </Card>

      {/* Forms Past Due */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-foreground">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
              Forms Past Due ({stats.pastDue})
            </div>
            <div className="flex items-center gap-2">
              {stats.pastDue > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearPastDue}>
                  Clear Past Due
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Forms that were due on previous days but not completed
            {showCalendar && ' - Click on calendar dates to see details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showCalendar ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date > new Date() || date < subDays(new Date(), 30)}
                  modifiers={{
                    hasMissedForms: (date) => hasMissedFormsOnDate(date)
                  }}
                  modifiersStyles={{
                    hasMissedForms: { backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))', fontWeight: 'bold' }
                  }}
                  className="rounded-md border p-3 pointer-events-auto"
                />
              </div>
              
              {selectedDate && (
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Missed Forms for {format(selectedDate, 'MMMM d, yyyy')}
                  </h4>
                  
                  {getMissedFormsForDate(selectedDate).length > 0 ? (
                    <div className="space-y-2">
                      {getMissedFormsForDate(selectedDate).map((form) => {
                        const businessDaysConfig = getBusinessDaysConfig(form);
                        return (
                          <div key={form.id} className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-foreground">{form.title}</h5>
                                  {businessDaysConfig.businessDaysOnly && (
                                    <Briefcase className="h-3 w-3 text-blue-600" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {form.schedule_type?.replace('_', ' ') || 'One-time'} form
                                  {businessDaysConfig.businessDaysOnly ? ' (business days only)' : ''}
                                  {form.schedule_time && ` - Due at ${form.schedule_time}`}
                                </p>
                              </div>
                            </div>
                            <Badge variant="destructive">
                              Missed
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No forms were due on this date
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            stats.pastDue > 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-foreground font-medium">
                  {stats.pastDue} form{stats.pastDue > 1 ? 's' : ''} past due
                </p>
                <p className="text-sm text-muted-foreground mt-2 mb-4">
                  These forms were scheduled for previous days and may need attention
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCalendar(true)}
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  View Calendar Details
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No forms past due</p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};
