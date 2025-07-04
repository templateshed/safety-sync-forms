import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Clock, Briefcase, Key, Copy, Trash2, Check } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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

interface AccessCode {
  id: string;
  form_id: string;
  access_code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  created_by: string;
}

interface OverdueFormsCardsProps {
  forms: Form[];
  onFormDeleted?: (formId: string) => void;
}

export const OverdueFormsCards: React.FC<OverdueFormsCardsProps> = ({ forms, onFormDeleted }) => {
  const [categorizedForms, setCategorizedForms] = useState<OverdueForm[]>([]);
  const [stats, setStats] = useState<OverdueStats>({
    overdueToday: 0,
    pastDue: 0,
    totalOverdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [accessCodes, setAccessCodes] = useState<Record<string, AccessCode[]>>({});
  const [generatingCode, setGeneratingCode] = useState<Record<string, boolean>>({});
  const [copiedCodes, setCopiedCodes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchOverdueForms = async () => {
      try {
        const result = await categorizeOverdueForms(forms);
        setCategorizedForms(result.categorizedForms);
        setStats(result.stats);
        
        // Fetch access codes for overdue forms
        await fetchAccessCodes(result.categorizedForms);
      } catch (error) {
        console.error('Error categorizing overdue forms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueForms();
  }, [forms]);

  const fetchAccessCodes = async (overdueForms: OverdueForm[]) => {
    try {
      const formIds = overdueForms.map(f => f.id);
      if (formIds.length === 0) return;

      const { data, error } = await supabase
        .from('overdue_form_access_codes')
        .select('*')
        .in('form_id', formIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const codesByForm: Record<string, AccessCode[]> = {};
      data?.forEach(code => {
        if (!codesByForm[code.form_id]) {
          codesByForm[code.form_id] = [];
        }
        codesByForm[code.form_id].push(code);
      });

      setAccessCodes(codesByForm);
    } catch (error) {
      console.error('Error fetching access codes:', error);
    }
  };

  const generateAccessCode = async (formId: string) => {
    setGeneratingCode(prev => ({ ...prev, [formId]: true }));
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate a new access code (expires in 48 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { data: codeData, error: codeError } = await supabase.rpc('generate_access_code');
      if (codeError) throw codeError;

      const { data, error } = await supabase
        .from('overdue_form_access_codes')
        .insert({
          form_id: formId,
          access_code: codeData,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setAccessCodes(prev => ({
        ...prev,
        [formId]: [data, ...(prev[formId] || [])]
      }));

      toast({
        title: "Access Code Generated",
        description: `Code ${data.access_code} created successfully`,
      });
    } catch (error) {
      console.error('Error generating access code:', error);
      toast({
        title: "Error",
        description: "Failed to generate access code",
        variant: "destructive",
      });
    } finally {
      setGeneratingCode(prev => ({ ...prev, [formId]: false }));
    }
  };

  const copyAccessCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/form/overdue/${code}`);
      setCopiedCodes(prev => ({ ...prev, [code]: true }));
      
      toast({
        title: "Access Link Copied",
        description: "Full access URL copied to clipboard",
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedCodes(prev => ({ ...prev, [code]: false }));
      }, 2000);
    } catch (error) {
      console.error('Error copying code:', error);
      toast({
        title: "Error",
        description: "Failed to copy access code",
        variant: "destructive",
      });
    }
  };

  const deleteForm = async (formId: string, formTitle: string) => {
    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Form Deleted",
        description: `"${formTitle}" has been deleted successfully`,
      });

      // Notify parent component
      onFormDeleted?.(formId);
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
    }
  };

  const getActiveAccessCode = (formId: string): AccessCode | null => {
    const codes = accessCodes[formId] || [];
    return codes.find(code => 
      !code.used_at && 
      new Date(code.expires_at) > new Date()
    ) || null;
  };

  const overdueToday = categorizedForms.filter(f => f.category === 'today');
  const pastDue = categorizedForms.filter(f => f.category === 'past');

  if (loading) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      {/* Overdue Today List - Full Width */}
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
                    <TableHead className="text-orange-800 font-medium">Access Code</TableHead>
                    <TableHead className="text-orange-800 font-medium">Status</TableHead>
                    <TableHead className="text-orange-800 font-medium text-right">Days</TableHead>
                    <TableHead className="text-orange-800 font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueToday.map((form) => {
                    const activeCode = getActiveAccessCode(form.id);
                    return (
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
                          {activeCode ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                  {activeCode.access_code}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyAccessCode(activeCode.access_code)}
                                  className="h-6 w-6 p-0"
                                  title="Copy full access URL"
                                >
                                  {copiedCodes[activeCode.access_code] ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Click copy to get full URL
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No active code</span>
                          )}
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateAccessCode(form.id)}
                              disabled={generatingCode[form.id]}
                              className="h-7"
                            >
                              {generatingCode[form.id] ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                              ) : (
                                <Key className="h-3 w-3 mr-1" />
                              )}
                              {generatingCode[form.id] ? 'Generating...' : 'Code'}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Form</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{form.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteForm(form.id, form.title)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
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

      {/* Past Due List - Full Width */}
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
                    <TableHead className="text-destructive font-medium">Access Code</TableHead>
                    <TableHead className="text-destructive font-medium">Status</TableHead>
                    <TableHead className="text-destructive font-medium text-right">Days</TableHead>
                    <TableHead className="text-destructive font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastDue.map((form) => {
                    const activeCode = getActiveAccessCode(form.id);
                    return (
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
                          {activeCode ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                                  {activeCode.access_code}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyAccessCode(activeCode.access_code)}
                                  className="h-6 w-6 p-0"
                                  title="Copy full access URL"
                                >
                                  {copiedCodes[activeCode.access_code] ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Click copy to get full URL
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No active code</span>
                          )}
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
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateAccessCode(form.id)}
                              disabled={generatingCode[form.id]}
                              className="h-7"
                            >
                              {generatingCode[form.id] ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                              ) : (
                                <Key className="h-3 w-3 mr-1" />
                              )}
                              {generatingCode[form.id] ? 'Generating...' : 'Code'}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Form</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{form.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteForm(form.id, form.title)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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