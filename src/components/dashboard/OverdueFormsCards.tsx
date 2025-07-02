
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Briefcase } from 'lucide-react';
import { OverdueForm, OverdueStats, categorizeOverdueForms } from './OverdueFormsLogic';
import { formatBusinessDaysConfig } from '@/utils/businessDays';

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

interface OverdueFormsCardsProps {
  forms: Form[];
}

export const OverdueFormsCards: React.FC<OverdueFormsCardsProps> = ({ forms }) => {
  const [categorizedForms, setCategorizedForms] = useState<OverdueForm[]>([]);
  const [stats, setStats] = useState<OverdueStats>({
    overdueToday: 0,
    pastDue: 0,
    totalOverdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverdueForms = async () => {
      try {
        const result = await categorizeOverdueForms(forms);
        setCategorizedForms(result.categorizedForms);
        setStats(result.stats);
      } catch (error) {
        console.error('Error categorizing overdue forms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueForms();
  }, [forms]);

  const overdueToday = categorizedForms.filter(f => f.category === 'today');
  const pastDue = categorizedForms.filter(f => f.category === 'past');

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardContent className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Overdue Today Card */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Clock className="h-5 w-5 mr-2 text-orange-500" />
            Overdue Today
          </CardTitle>
          <CardDescription>Forms that became overdue today</CardDescription>
        </CardHeader>
        <CardContent>
          {overdueToday.length > 0 ? (
            <div className="space-y-3">
              {overdueToday.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{form.title}</h4>
                      {form.businessDaysConfig?.businessDaysOnly && (
                        <Briefcase className="h-3 w-3 text-blue-600" title="Business days only" />
                      )}
                    </div>
                    <p className="text-sm text-orange-700">
                      {form.reason}
                    </p>
                    {form.businessDaysConfig?.businessDaysOnly && (
                      <p className="text-xs text-blue-600 mt-1">
                        {formatBusinessDaysConfig(form.businessDaysConfig)}
                      </p>
                    )}
                    {form.daysOverdue > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        {form.daysOverdue === 1 ? '1 day overdue' : `${form.daysOverdue} days overdue`}
                        {form.businessDaysConfig?.businessDaysOnly ? ' (business days)' : ''}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                    Today
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No forms overdue today</p>
          )}
        </CardContent>
      </Card>

      {/* Past Due Card */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
            Past Due
          </CardTitle>
          <CardDescription>Forms overdue from previous days</CardDescription>
        </CardHeader>
        <CardContent>
          {pastDue.length > 0 ? (
            <div className="space-y-3">
              {pastDue.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{form.title}</h4>
                      {form.businessDaysConfig?.businessDaysOnly && (
                        <Briefcase className="h-3 w-3 text-blue-600" title="Business days only" />
                      )}
                    </div>
                    <p className="text-sm text-destructive">
                      {form.reason}
                    </p>
                    {form.businessDaysConfig?.businessDaysOnly && (
                      <p className="text-xs text-blue-600 mt-1">
                        {formatBusinessDaysConfig(form.businessDaysConfig)}
                      </p>
                    )}
                    {form.daysOverdue > 0 && (
                      <p className="text-xs text-destructive/80 mt-1">
                        {form.daysOverdue === 1 ? '1 day overdue' : `${form.daysOverdue} days overdue`}
                        {form.businessDaysConfig?.businessDaysOnly ? ' (business days)' : ''}
                      </p>
                    )}
                  </div>
                  <Badge variant="destructive">Past Due</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No past due forms</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
