import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar, Download, Filter, Eye, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ResponseFormViewer } from './ResponseFormViewer';

interface FormResponseWithUserData {
  id: string;
  form_id: string;
  respondent_email: string | null;
  response_data: any;
  submitted_at: string;
  updated_at?: string;
  updated_by?: string;
  edit_history?: any[];
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

interface FormField {
  id: string;
  field_type: string;
  label: string;
}

interface FormSignature {
  id: string;
  field_id: string;
  signature_data: string;
  signature_type: string;
  typed_name?: string;
}

export const FormResponses = () => {
  const [responses, setResponses] = useState<FormResponseWithUserData[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [selectedResponse, setSelectedResponse] = useState<FormResponseWithUserData | null>(null);
  const [viewMode, setViewMode] = useState<'details' | 'form'>('details');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [signatures, setSignatures] = useState<FormSignature[]>([]);

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

  const formatResponseData = (data: any, formFieldsData: any, responseSignatures: FormSignature[]) => {
    if (typeof data !== 'object' || !data) return 'No data';
    
    console.log('Formatting response data:', data, 'with form fields:', formFieldsData, 'and signatures:', responseSignatures);
    
    return Object.entries(data).map(([key, value]) => {
      // Only show entries where we have a field label (this filters out UUIDs that don't have labels)
      const fieldLabel = formFieldsData && formFieldsData[key] ? formFieldsData[key] : null;
      
      if (!fieldLabel) {
        return null; // Skip entries without field labels (like UUIDs)
      }

      // Find the corresponding field to check if it's a signature field
      const field = formFields.find(f => f.id === key);
      
      if (field && field.field_type === 'signature') {
        // Find the signature for this field
        const signature = responseSignatures.find(sig => sig.field_id === key);
        
        if (signature) {
          return (
            <div key={key} className="mb-3">
              <span className="font-medium text-sm text-foreground">{fieldLabel}:</span>
              <div className="mt-2 border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">
                    Signature ({signature.signature_type})
                  </span>
                  {signature.typed_name && (
                    <span className="text-xs text-gray-600">
                      Name: {signature.typed_name}
                    </span>
                  )}
                </div>
                <img 
                  src={signature.signature_data} 
                  alt={`Signature for ${fieldLabel}`}
                  className="max-w-full h-auto border rounded"
                  style={{ maxHeight: '100px' }}
                />
              </div>
            </div>
          );
        } else {
          return (
            <div key={key} className="mb-1">
              <span className="font-medium text-sm text-foreground">{fieldLabel}:</span>{' '}
              <span className="text-gray-500 text-sm">No signature provided</span>
            </div>
          );
        }
      }
      
      return (
        <div key={key} className="mb-1">
          <span className="font-medium text-sm text-foreground">{fieldLabel}:</span>{' '}
          <span className="text-foreground">{String(value)}</span>
        </div>
      );
    }).filter(Boolean); // Remove null entries
  };

  const fetchSignaturesForResponse = async (responseId: string) => {
    try {
      const { data: signaturesData, error } = await supabase
        .from('form_signatures')
        .select('*')
        .eq('response_id', responseId);

      if (error) throw error;
      return signaturesData || [];
    } catch (error) {
      console.error('Error fetching signatures:', error);
      return [];
    }
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

      // Fetch form fields for signature handling
      if (filteredData.length > 0) {
        const formIds = [...new Set(filteredData.map(r => r.form_id))];
        const { data: fieldsData, error: fieldsError } = await supabase
          .from('form_fields')
          .select('id, field_type, label')
          .in('form_id', formIds);

        if (fieldsError) throw fieldsError;
        setFormFields(fieldsData || []);
      }
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

  const handleViewResponse = async (response: FormResponseWithUserData, mode: 'details' | 'form') => {
    // Fetch signatures for this response when viewing details
    if (mode === 'details') {
      const responseSignatures = await fetchSignaturesForResponse(response.id);
      setSignatures(responseSignatures);
    }
    
    setSelectedResponse(response);
    setViewMode(mode);
  };

  const handleResponseUpdated = () => {
    setSelectedResponse(null);
    fetchResponses(); // Refresh the list
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Form Responses</h2>
          <p className="text-muted-foreground">
            View and manage all form submissions
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

      {/* Filters */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
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
                  <SelectItem value="all">All forms</SelectItem>
                  {forms.map((form) => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.title}
                    </SelectItem>
                  ))}
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

      {/* Responses Table */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-foreground">Responses ({responses.length})</CardTitle>
          <CardDescription>
            {responses.length === 0 ? 'No responses found' : `View and manage form responses`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No responses found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-foreground">Form</TableHead>
                    <TableHead className="text-foreground">Respondent</TableHead>
                    <TableHead className="text-foreground">Email</TableHead>
                    <TableHead className="text-foreground">Submitted</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.map((response) => (
                    <TableRow key={response.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <Badge variant="secondary" className="bg-secondary/50 text-secondary-foreground">
                          {response.form_title || 'Unknown Form'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {getRespondentName(response) || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {getRespondentEmail(response)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-foreground">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(response.submitted_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {response.updated_at && response.updated_at !== response.submitted_at ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Modified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Original
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewResponse(response, 'details')}
                            className="hover:bg-muted/80"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewResponse(response, 'form')}
                            className="hover:bg-muted/80"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Detail Modal */}
      {selectedResponse && viewMode === 'details' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Response Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedResponse(null)}
                className="hover:bg-muted/80"
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="font-medium text-foreground">Form:</label>
                <p className="text-foreground">{selectedResponse.form_title}</p>
              </div>
              
              <div>
                <label className="font-medium text-foreground">Respondent:</label>
                <p className="text-foreground">{getRespondentName(selectedResponse) || 'Anonymous'}</p>
              </div>
              
              <div>
                <label className="font-medium text-foreground">Email:</label>
                <p className="text-foreground">{getRespondentEmail(selectedResponse)}</p>
              </div>
              
              <div>
                <label className="font-medium text-foreground">Submitted:</label>
                <p className="text-foreground">{new Date(selectedResponse.submitted_at).toLocaleString()}</p>
              </div>

              {selectedResponse.updated_at && selectedResponse.updated_at !== selectedResponse.submitted_at && (
                <div>
                  <label className="font-medium text-foreground">Last Modified:</label>
                  <p className="text-foreground">{new Date(selectedResponse.updated_at).toLocaleString()}</p>
                </div>
              )}
              
              <div>
                <label className="font-medium text-foreground">Response Data:</label>
                <div className="bg-muted/30 p-4 rounded mt-2 border border-border">
                  {formatResponseData(selectedResponse.response_data, selectedResponse.form_fields, signatures)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Response Form Viewer */}
      {selectedResponse && viewMode === 'form' && (
        <ResponseFormViewer
          response={selectedResponse}
          onClose={() => setSelectedResponse(null)}
          onSave={handleResponseUpdated}
        />
      )}
    </div>
  );
};
