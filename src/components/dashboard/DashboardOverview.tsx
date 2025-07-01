
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, FileText, Users, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format, isToday, isPast, isFuture, addDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';

interface Form {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  schedule_start_date?: string;
  schedule_end_date?: string;
  schedule_type?: string;
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
  overdueForms: number;
  upcomingForms: number;
}

export const DashboardOverview = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [recentResponses, setRecentResponses] = useState<FormResponse[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    publishedForms: 0,
    totalResponses: 0,
    formsToday: 0,
    overdueForms: 0,
    upcomingForms: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

      // Calculate forms due today with proper daily form handling
      const formsToday = calculateFormsDueToday(formsData || []);
      console.log('Forms due today calculation:', formsToday);

      // Calculate overdue forms with improved logic that includes response checking
      const overdueForms = await calculateOverdueFormsWithResponses(formsData || [], responsesData || []);
      console.log('Overdue forms calculation:', overdueForms);

      const upcomingForms = formsData?.filter(f => 
        f.schedule_start_date && isFuture(new Date(f.schedule_start_date))
      ).length || 0;

      setStats({
        totalForms,
        publishedForms,
        totalResponses,
        formsToday,
        overdueForms,
        upcomingForms,
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
      
      console.log(`Checking form "${form.title}":`, {
        scheduleType,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        today: today.toISOString()
      });
      
      // If no start date, can't be due today
      if (!startDate) return false;
      
      // If end date has passed, form is no longer active
      if (endDate && isPast(endDate)) {
        console.log(`Form "${form.title}" is past end date`);
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

  const calculateOverdueFormsWithResponses = async (formsData: Form[], responsesData: any[]): Promise<number> => {
    const today = new Date();
    const todayStart = startOfDay(today);
    
    return formsData.filter(form => {
      if (form.status !== 'published') return false;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      
      console.log(`Checking overdue for form "${form.title}":`, {
        scheduleType,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        today: today.toISOString()
      });
      
      // If no start date, can't be overdue
      if (!startDate) return false;
      
      // If start date is in the future, can't be overdue yet
      if (isFuture(startDate)) return false;
      
      switch (scheduleType) {
        case 'daily': {
          // For daily forms, check if we have missing responses for any days since start
          const daysSinceStart = differenceInDays(todayStart, startOfDay(startDate));
          console.log(`Days since start for daily form "${form.title}":`, daysSinceStart);
          
          if (daysSinceStart < 1) {
            // Form started today, not overdue yet
            console.log(`Daily form "${form.title}" started today, not overdue`);
            return false;
          }
          
          // Check if form has ended
          if (endDate && isPast(endDate)) {
            console.log(`Daily form "${form.title}" has ended, checking if responses exist`);
            // Form has ended, check if we have any responses
            const hasResponses = responsesData.some(response => response.form_id === form.id);
            return !hasResponses; // Overdue if no responses at all
          }
          
          // For active daily forms without end date, check recent responses
          const formResponses = responsesData.filter(response => response.form_id === form.id);
          console.log(`Form responses for "${form.title}":`, formResponses.length);
          
          if (formResponses.length === 0) {
            // No responses at all, and form has been active for at least a day
            console.log(`Daily form "${form.title}" has no responses and has been active for ${daysSinceStart} days - OVERDUE`);
            return true;
          }
          
          // Check if latest response is more than 24 hours old
          const latestResponse = formResponses.sort((a, b) => 
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          )[0];
          
          const latestResponseDate = new Date(latestResponse.submitted_at);
          const hoursSinceLastResponse = (todayStart.getTime() - latestResponseDate.getTime()) / (1000 * 60 * 60);
          
          console.log(`Latest response for "${form.title}" was ${hoursSinceLastResponse} hours ago`);
          
          // Consider overdue if no response in last 24+ hours
          const isOverdue = hoursSinceLastResponse > 24;
          console.log(`Daily form "${form.title}" overdue:`, isOverdue);
          return isOverdue;
        }
          
        case 'weekly':
        case 'monthly': {
          // For recurring forms, overdue if end date has passed
          const isRecurringOverdue = endDate ? isPast(endDate) : false;
          console.log(`Recurring form "${form.title}" overdue:`, isRecurringOverdue);
          return isRecurringOverdue;
        }
          
        case 'one_time':
        default: {
          // For one-time forms, overdue if end date has passed (or start date if no end date)
          const overdueDate = endDate || startDate;
          const isOneTimeOverdue = overdueDate ? isPast(overdueDate) : false;
          console.log(`One-time form "${form.title}" overdue:`, isOneTimeOverdue);
          return isOneTimeOverdue;
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
      
      if (!startDate) return false;
      if (endDate && isPast(endDate)) return false;
      
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

  const getOverdueForms = async () => {
    const today = new Date();
    const todayStart = startOfDay(today);
    
    // Get all responses for overdue calculation
    const { data: allResponses } = await supabase
      .rpc('get_form_responses_with_user_data');
    
    return forms.filter(form => {
      if (form.status !== 'published') return false;
      
      const scheduleType = form.schedule_type || 'one_time';
      const startDate = form.schedule_start_date ? new Date(form.schedule_start_date) : null;
      const endDate = form.schedule_end_date ? new Date(form.schedule_end_date) : null;
      
      if (!startDate) return false;
      if (isFuture(startDate)) return false;
      
      switch (scheduleType) {
        case 'daily': {
          const daysSinceStart = differenceInDays(todayStart, startOfDay(startDate));
          
          if (daysSinceStart < 1) return false;
          
          if (endDate && isPast(endDate)) {
            const hasResponses = (allResponses || []).some(response => response.form_id === form.id);
            return !hasResponses;
          }
          
          const formResponses = (allResponses || []).filter(response => response.form_id === form.id);
          
          if (formResponses.length === 0) {
            return true;
          }
          
          const latestResponse = formResponses.sort((a, b) => 
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          )[0];
          
          const latestResponseDate = new Date(latestResponse.submitted_at);
          const hoursSinceLastResponse = (todayStart.getTime() - latestResponseDate.getTime()) / (1000 * 60 * 60);
          
          return hoursSinceLastResponse > 24;
        }
        case 'weekly':
        case 'monthly':
          return endDate ? isPast(endDate) : false;
        case 'one_time':
        default: {
          const overdueDate = endDate || startDate;
          return overdueDate ? isPast(overdueDate) : false;
        }
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            <CardTitle className="text-sm font-medium text-foreground">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdueForms}</div>
            <p className="text-xs text-muted-foreground">
              Forms past due date
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
                {formsDueToday.map((form) => (
                  <div key={form.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">{form.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {form.schedule_type === 'daily' ? 'Daily form' : 
                         form.schedule_type === 'weekly' ? 'Weekly form' :
                         form.schedule_type === 'monthly' ? 'Monthly form' :
                         form.schedule_start_date ? format(new Date(form.schedule_start_date), 'h:mm a') : 'One-time form'}
                      </p>
                    </div>
                    <Badge variant={form.status === 'published' ? 'default' : 'secondary'}>
                      {form.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No forms due today</p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Forms - Using async component pattern */}
        <OverdueFormsCard getOverdueForms={getOverdueForms} />
      </div>
    </div>
  );
};

// Separate component for overdue forms to handle async data fetching
const OverdueFormsCard = ({ getOverdueForms }: { getOverdueForms: () => Promise<Form[]> }) => {
  const [overdueForms, setOverdueForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverdueForms = async () => {
      try {
        const forms = await getOverdueForms();
        setOverdueForms(forms);
      } catch (error) {
        console.error('Error fetching overdue forms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueForms();
  }, [getOverdueForms]);

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center text-foreground">
          <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
          Overdue Forms
        </CardTitle>
        <CardDescription>Forms that need attention or have missing responses</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : overdueForms.length > 0 ? (
          <div className="space-y-3">
            {overdueForms.map((form) => (
              <div key={form.id} className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div>
                  <h4 className="font-medium text-foreground">{form.title}</h4>
                  <p className="text-sm text-destructive">
                    {form.schedule_type === 'daily' ? 'Missing recent responses' :
                     form.schedule_end_date ? `Due: ${format(new Date(form.schedule_end_date), 'MMM d, yyyy')}` :
                     'Overdue'}
                  </p>
                </div>
                <Badge variant="destructive">Overdue</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No overdue forms</p>
        )}
      </CardContent>
    </Card>
  );
};
