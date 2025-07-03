
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      {/* Overdue Today List */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Clock className="h-5 w-5 mr-2 text-orange-500" />
            Overdue Today ({overdueToday.length})
          </CardTitle>
          <CardDescription>Forms that became overdue today</CardDescription>
        </CardHeader>
        <CardContent>
          {overdueToday.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50/50">
                    <TableHead className="text-orange-800 font-medium">Form</TableHead>
                    <TableHead className="text-orange-800 font-medium">Status</TableHead>
                    <TableHead className="text-orange-800 font-medium text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueToday.map((form) => (
                    <TableRow key={`${form.id}-today`} className="hover:bg-orange-50/30">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">{form.title}</h4>
                            {form.businessDaysConfig?.businessDaysOnly && (
                              <Briefcase className="h-3 w-3 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-orange-700">{form.reason}</p>
                          {form.businessDaysConfig?.businessDaysOnly && (
                            <p className="text-xs text-blue-600">
                              {formatBusinessDaysConfig(form.businessDaysConfig)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                          Today
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {form.daysOverdue > 0 && (
                          <span className="text-sm text-orange-600">
                            {form.daysOverdue === 1 ? '1 day' : `${form.daysOverdue} days`}
                            {form.businessDaysConfig?.businessDaysOnly ? ' (biz)' : ''}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No forms overdue today</p>
          )}
        </CardContent>
      </Card>

      {/* Past Due List */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
            Past Due ({pastDue.length})
          </CardTitle>
          <CardDescription>Forms overdue from previous days</CardDescription>
        </CardHeader>
        <CardContent>
          {pastDue.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-destructive/10">
                    <TableHead className="text-destructive font-medium">Form</TableHead>
                    <TableHead className="text-destructive font-medium">Status</TableHead>
                    <TableHead className="text-destructive font-medium text-right">Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastDue.map((form) => (
                    <TableRow key={`${form.id}-past`} className="hover:bg-destructive/5">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground">{form.title}</h4>
                            {form.businessDaysConfig?.businessDaysOnly && (
                              <Briefcase className="h-3 w-3 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-destructive">{form.reason}</p>
                          {form.businessDaysConfig?.businessDaysOnly && (
                            <p className="text-xs text-blue-600">
                              {formatBusinessDaysConfig(form.businessDaysConfig)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">Past Due</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {form.daysOverdue > 0 && (
                          <span className="text-sm text-destructive/80">
                            {form.daysOverdue === 1 ? '1 day' : `${form.daysOverdue} days`}
                            {form.businessDaysConfig?.businessDaysOnly ? ' (biz)' : ''}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No past due forms</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
