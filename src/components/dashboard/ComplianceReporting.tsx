
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Download, Calendar, Clock, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ComplianceResponse {
  id: string;
  form_id: string;
  form_title: string;
  respondent_email: string;
  response_data: any;
  submitted_at: string;
  intended_submission_date?: string;
  is_late_submission?: boolean;
  compliance_notes?: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface ComplianceStats {
  total_responses: number;
  on_time_responses: number;
  late_responses: number;
  compliance_rate: number;
}

export const ComplianceReporting: React.FC = () => {
  const [responses, setResponses] = useState<ComplianceResponse[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [forms, setForms] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    fetchForms();
    fetchComplianceData();
  }, [selectedForm, dateFilter]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title')
        .order('title');

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error fetching forms:', error);
    }
  };

  const fetchComplianceData = async () => {
    try {
      setLoading(true);

      // Build query for responses with compliance data
      let query = supabase
        .rpc('get_form_responses_with_user_data')
        .order('submitted_at', { ascending: false });

      // Apply form filter
      if (selectedForm !== 'all') {
        query = query.eq('form_id', selectedForm);
      }

      const { data: responsesData, error: responsesError } = await query;

      if (responsesError) throw responsesError;

      const transformedResponses: ComplianceResponse[] = (responsesData || []).map((response: any) => ({
        id: response.id,
        form_id: response.form_id,
        form_title: response.form_title,
        respondent_email: response.effective_email,
        response_data: response.response_data,
        submitted_at: response.submitted_at,
        intended_submission_date: response.intended_submission_date || response.submitted_at,
        is_late_submission: response.is_late_submission || false,
        compliance_notes: response.compliance_notes,
        first_name: response.first_name,
        last_name: response.last_name,
      }));

      // Apply date filter if set
      const filteredResponses = dateFilter 
        ? transformedResponses.filter(response => {
            const intendedDate = new Date(response.intended_submission_date || response.submitted_at);
            const filterDate = new Date(dateFilter);
            return intendedDate.toDateString() === filterDate.toDateString();
          })
        : transformedResponses;

      setResponses(filteredResponses);

      // Calculate compliance stats
      const totalResponses = filteredResponses.length;
      const lateResponses = filteredResponses.filter(r => r.is_late_submission).length;
      const onTimeResponses = totalResponses - lateResponses;
      const complianceRate = totalResponses > 0 ? ((onTimeResponses / totalResponses) * 100) : 100;

      setStats({
        total_responses: totalResponses,
        on_time_responses: onTimeResponses,
        late_responses: lateResponses,
        compliance_rate: Math.round(complianceRate * 100) / 100,
      });

    } catch (error: any) {
      console.error('Error fetching compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch compliance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportComplianceReport = async () => {
    try {
      // Prepare CSV data
      const csvHeaders = [
        'Form Title',
        'Respondent Name',
        'Respondent Email',
        'Intended Submission Date',
        'Actual Submission Date',
        'Status',
        'Compliance Notes'
      ];

      const csvRows = responses.map(response => [
        response.form_title,
        `${response.first_name || ''} ${response.last_name || ''}`.trim() || 'N/A',
        response.respondent_email,
        new Date(response.intended_submission_date || response.submitted_at).toLocaleString(),
        new Date(response.submitted_at).toLocaleString(),
        response.is_late_submission ? 'Late' : 'On Time',
        response.compliance_notes || 'N/A'
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `compliance_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Compliance report exported successfully",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "Failed to export compliance report",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Compliance Reporting</h2>
          <p className="text-muted-foreground mt-1">Track form submissions and compliance rates</p>
        </div>
        <Button onClick={exportComplianceReport} disabled={responses.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="form-filter">Form</Label>
            <Select value={selectedForm} onValueChange={setSelectedForm}>
              <SelectTrigger>
                <SelectValue placeholder="All forms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All forms</SelectItem>
                {forms.map(form => (
                  <SelectItem key={form.id} value={form.id}>
                    {form.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="date-filter">Due Date</Label>
            <Input
              id="date-filter"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compliance Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Responses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_responses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.on_time_responses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Late</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.late_responses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.compliance_rate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Responses List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Form Responses</CardTitle>
          <CardDescription>
            All form responses with compliance tracking information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No compliance data found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Responses will appear here once forms with scheduled due dates are submitted
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <Card key={response.id} className="border-l-4" style={{
                  borderLeftColor: response.is_late_submission ? '#ef4444' : '#22c55e'
                }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-base">{response.form_title}</CardTitle>
                          <Badge variant={response.is_late_submission ? "destructive" : "default"}>
                            {response.is_late_submission ? (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Late
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                On Time
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Respondent:</strong> {response.respondent_email}</p>
                          <p>
                            <strong>Due:</strong> {new Date(response.intended_submission_date || response.submitted_at).toLocaleString()}
                          </p>
                          <p>
                            <strong>Submitted:</strong> {new Date(response.submitted_at).toLocaleString()}
                          </p>
                          {response.is_late_submission && response.compliance_notes && (
                            <Alert className="mt-2">
                              <AlertDescription>
                                <strong>Late Submission Reason:</strong> {response.compliance_notes}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
