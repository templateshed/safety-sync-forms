
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, FileText, Users, TrendingUp, Clock, AlertTriangle, CheckCircle, Briefcase } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isPast, isFuture, addDays, startOfDay, endOfDay, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';
import { OverdueFormsCards } from './OverdueFormsCards';
import { categorizeOverdueForms } from './OverdueFormsLogic';
import { isBusinessDay, BusinessDaysConfig, DEFAULT_BUSINESS_DAYS } from '@/utils/businessDays';

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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

      setForms(formsData || []);
      
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
      const formsToday = calculateFormsDueToday(formsData || []);
      console.log('Forms due today calculation:', formsToday);

      // Calculate categorized overdue forms
      const { stats: overdueStats } = await categorizeOverdueForms(formsData || []);
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
          // For daily forms, check if today is within the active period
          const isDailyDue = startDate <= todayEnd && (!endDate || endDate >= todayStart);
          console.log(`Daily form "${form.title}" due today:`, isDailyDue);
          return isDailyDue;
        }
          
        case 'weekly': {
          // For weekly forms, check if it's the right day of the week and within active period
          const dayOfWeek = today.getDay();
          const weeklyStartDay = startDate.getDay();
          const isWeeklyDue = dayOfWeek === weeklyStartDay && 
                             startDate <= todayEnd && 
                             (!endDate || endDate >= todayStart);
          console.log(`Weekly form "${form.title}" due today:`, isWeeklyDue, 
                     `(today: ${dayOfWeek}, start day: ${weeklyStartDay})`);
          return isWeeklyDue;
        }
          
        case 'monthly': {
          // For monthly forms, check if it's the same day of month and within active period
          const dayOfMonth = today.getDate();
          const monthlyStartDay = startDate.getDate();
          const isMonthlyDue = dayOfMonth === monthlyStartDay && 
                              startDate <= todayEnd && 
                              (!endDate || endDate >= todayStart);
          console.log(`Monthly form "${form.title}" due today:`, isMonthlyDue,
                     `(today: ${dayOfMonth}, start day: ${monthlyStartDay})`);
          return isMonthlyDue;
        }
          
        case 'one_time':
        default: {
          // For one-time forms, check if start date is today
          const isOneTimeDue = isToday(startDate);
          console.log(`One-time form "${form.title}" due today:`, isOneTimeDue);
          return isOneTimeDue;
        }
      }
    }).length;
  };

  const getFormsDueToday = () => {
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
        case 'daily':
          return startDate <= todayEnd && (!endDate || endDate >= todayStart);
        case 'weekly': {
          const dayOfWeek = today.getDay();
          const weeklyStartDay = startDate.getDay();
          return dayOfWeek === weeklyStartDay && startDate <= todayEnd && (!endDate || endDate >= todayStart);
        }
        case 'monthly': {
          const dayOfMonth = today.getDate();
          const monthlyStartDayOfMonth = startDate.getDate();
          return dayOfMonth === monthlyStartDayOfMonth && startDate <= todayEnd && (!endDate || endDate >= todayStart);
        }
        case 'one_time':
        default:
          return isToday(startDate);
      }
    });
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms Due Today */}
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <CalendarDays className="h-5 w-5 mr-2" />
              Forms Due Today
            </CardTitle>
            <CardDescription>Forms scheduled to be active today</CardDescription>
          </CardHeader>
          <CardContent>
            {formsDueToday.length > 0 ? (
              <div className="space-y-3">
                {formsDueToday.map((form) => {
                  const businessDaysConfig = getBusinessDaysConfig(form);
                  return (
                    <div key={form.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-foreground">{form.title}</h4>
                          {businessDaysConfig.businessDaysOnly && (
                            <Briefcase className="h-3 w-3 text-blue-600" title="Business days only" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {form.schedule_type === 'daily' ? `Daily form - Due at ${form.schedule_time || '09:00'}` : 
                           form.schedule_type === 'weekly' ? 'Weekly form' :
                           form.schedule_type === 'monthly' ? 'Monthly form' :
                           form.schedule_start_date ? format(new Date(form.schedule_start_date), 'h:mm a') : 'One-time form'}
                          {businessDaysConfig.businessDaysOnly ? ' (business days)' : ''}
                        </p>
                      </div>
                      <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
                        {form.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No forms due today</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Forms Cards */}
      <OverdueFormsCards forms={forms} />
    </div>
  );
};
