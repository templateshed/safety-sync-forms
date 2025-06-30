
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar, Download, Filter, Eye, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FormResponseWithUserData {
  id: string;
  form_id: string;
  respondent_email: string | null;
  response_data: any;
  submitted_at: string;
  respondent_user_id: string | null;
  form_title: string;
  first_name: string | null;
  last_name: string | null;
  effective_email: string | null;
  ip_address: unknown | null;
  user_agent: string | null;
  form_fields: any;
}

interface Form {
  id: string;
  title: string;
}

export const FormResponses = () => {
  const [responses, setResponses] = useState<FormResponseWithUserData[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedResponse, setSelectedResponse] = useState<FormResponseWithUserData | null>(null);

  // Define helper functions first, before they're used
  const getRespondentEmail = (response: FormResponseWithUserData) => {
    console.log('Getting email for response:', response.id, 'effective_email:', response.effective_email);
    
    // Use the effective_email from the function which combines respondent_email and auth.users.email
    if (response.effective_email) {
      return response.effective_email;
    }
    
    return 'Anonymous';
  };

  const getRespondentName = (response: FormResponseWithUserData) => {
    console.log('Getting name for response:', response.id, 'first_name:', response.first_name, 'last_name:', response.last_name);
    
    if (response.first_name && response.last_name) {
      return `${response.first_name} ${response.last_name}`;
    } else if (response.first_name) {
      return response.first_name;
    } else if (response.last_name) {
      return response.last_name;
    }
    return null;
  };

  const formatResponseDataForCSV = (data: any, formFields: any) => {
    if (typeof data !== 'object' || !data) return '';
    
    return Object.entries(data).map(([key, value]) => {
      // Try to get the field label from formFields, fallback to the key
      const fieldLabel = formFields && formFields[key] ? formFields[key] : key;
      return `${fieldLabel}: ${String(value)}`;
    }).join('; ');
  };

  const formatResponseData = (data: any, formFields: any) => {
    if (typeof data !== 'object' || !data) return 'No data';
    
    console.log('Formatting response data:', data, 'with form fields:', formFields);
    
    return Object.entries(data).map(([key, value]) => {
      // Try to get the field label from formFields, fallback to the key
      const fieldLabel = formFields && formFields[key] ? formFields[key] : key;
      
      return (
        <div key={key} className="mb-2 p-2 bg-muted/20 rounded border">
          <span className="font-medium text-sm text-foreground block mb-1">{fieldLabel}</span>
          <span className="text-foreground text-sm">{String(value)}</span>
        </div>
      );
    });
  };

  useEffect(() => {
    fetchForms();
    fetchResponses();
  }, []);

  useEffect(() => {
    fetchResponses();
  }, [selectedForm, dateFrom, dateTo]);

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
      toast({
        title: "Error",
        description: "Failed to fetch forms",
        variant: "destructive",
      });
    }
  };

  const fetchResponses = async () => {
    try {
      setLoading(true);
      console.log('Fetching responses using new function...');
      
      // Use the new security definer function to get responses with user data
      const { data: responsesData, error: responsesError } = await supabase
        .rpc('get_form_responses_with_user_data');

      if (responsesError) throw responsesError;
      
      console.log('Raw responses data from function:', responsesData);
      
      let filteredData = responsesData || [];

      // Apply filters
      if (selectedForm !== 'all') {
        filteredData = filteredData.filter(response => response.form_id === selectedForm);
      }

      if (dateFrom) {
        filteredData = filteredData.filter(response => 
          new Date(response.submitted_at) >= dateFrom
        );
      }

      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        filteredData = filteredData.filter(response => 
          new Date(response.submitted_at) <= endOfDay
        );
      }

      // Sort by submission date (newest first)
      filteredData.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      
      console.log('Final filtered responses:', filteredData);
      setResponses(filteredData);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast({
        title: "Error",
        description: "Failed to fetch responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportResponses = () => {
    const csvContent = [
      ['Form', 'Email', 'Name', 'Submitted At', 'Response Data'],
      ...responses.map(response => [
        response.form_title || 'Unknown Form',
        getRespondentEmail(response),
        getRespondentName(response) || '',
        new Date(response.submitted_at).toLocaleString(),
        formatResponseDataForCSV(response.response_data, response.form_fields)
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-responses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSelectedForm('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Form Responses</h2>
          <p className="text-muted-foreground">
            View and manage all form submissions ({responses.length} total)
          </p>
        </div>
        <Button 
          onClick={exportResponses} 
          disabled={responses.length === 0}
          className="brand-gradient hover:shadow-lg transition-all duration-200"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Improved Filters */}
      <Card className="glass-effect">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              <CardTitle className="text-foreground">Filters</CardTitle>
            </div>
            {(selectedForm !== 'all' || dateFrom || dateTo) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Form</label>
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="All forms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All forms ({responses.length})</SelectItem>
                  {forms.map((form) => {
                    const formResponseCount = responses.filter(r => r.form_id === form.id).length;
                    return (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title} ({formResponseCount})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">From Date</label>
              <DatePicker
                date={dateFrom}
                onSelect={setDateFrom}
                placeholder="Select from date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To Date</label>
              <DatePicker
                date={dateTo}
                onSelect={setDateTo}
                placeholder="Select to date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Improved Responses Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-foreground">Responses</CardTitle>
          <CardDescription>
            {loading ? 'Loading responses...' : 
             responses.length === 0 ? 'No responses found matching your criteria' : 
             `Showing ${responses.length} response(s)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No responses found</p>
                <p>No form responses match your current filter criteria.</p>
              </div>
              {(selectedForm !== 'all' || dateFrom || dateTo) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground font-semibold">Form</TableHead>
                    <TableHead className="text-foreground font-semibold">Respondent</TableHead>
                    <TableHead className="text-foreground font-semibold">Email</TableHead>
                    <TableHead className="text-foreground font-semibold">Submitted</TableHead>
                    <TableHead className="text-foreground font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id} className="border-border hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                          {response.form_title || 'Unknown Form'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {getRespondentName(response) || (
                          <span className="text-muted-foreground italic">Anonymous</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground">
                        <span className="font-mono text-sm">
                          {getRespondentEmail(response)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-foreground">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(response.submitted_at).toLocaleDateString()} at{' '}
                            {new Date(response.submitted_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedResponse(response)}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Improved Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl border border-border max-w-3xl w-full max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-border bg-muted/20">
              <div>
                <h3 className="text-xl font-semibold text-foreground">Response Details</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Submitted {new Date(selectedResponse.submitted_at).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedResponse(null)}
                className="hover:bg-muted/80 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Form</label>
                    <p className="text-foreground font-medium">{selectedResponse.form_title}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Respondent</label>
                    <p className="text-foreground">{getRespondentName(selectedResponse) || 'Anonymous'}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-foreground font-mono text-sm">{getRespondentEmail(selectedResponse)}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Submitted</label>
                    <p className="text-foreground">{new Date(selectedResponse.submitted_at).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Response Data</label>
                  <div className="space-y-2">
                    {formatResponseData(selectedResponse.response_data, selectedResponse.form_fields)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
