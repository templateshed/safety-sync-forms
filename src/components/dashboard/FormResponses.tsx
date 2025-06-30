
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Filter, Search, Eye } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FormResponseWithUserData | null>(null);

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
          new Date(response.submitted_at) >= new Date(dateFrom)
        );
      }

      if (dateTo) {
        filteredData = filteredData.filter(response => 
          new Date(response.submitted_at) <= new Date(dateTo + 'T23:59:59')
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

  const filteredResponses = responses.filter(response => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const formTitle = response.form_title?.toLowerCase() || '';
    const email = getRespondentEmail(response).toLowerCase();
    
    return formTitle.includes(searchLower) || 
           email.includes(searchLower);
  });

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

  const exportResponses = () => {
    const csvContent = [
      ['Form', 'Email', 'Name', 'Submitted At', 'Response Data'],
      ...filteredResponses.map(response => [
        response.form_title || 'Unknown Form',
        getRespondentEmail(response),
        getRespondentName(response) || '',
        new Date(response.submitted_at).toLocaleString(),
        JSON.stringify(response.response_data)
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

  const formatResponseData = (data: any) => {
    if (typeof data !== 'object' || !data) return 'No data';
    
    return Object.entries(data).map(([key, value]) => (
      <div key={key} className="mb-1">
        <span className="font-medium text-sm">{key}:</span> {String(value)}
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Form Responses</h2>
          <p className="text-muted-foreground">
            View and manage all form submissions
          </p>
        </div>
        <Button onClick={exportResponses} disabled={filteredResponses.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search responses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Form</label>
              <Select value={selectedForm} onValueChange={setSelectedForm}>
                <SelectTrigger>
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
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Responses ({filteredResponses.length})</CardTitle>
          <CardDescription>
            {filteredResponses.length === 0 ? 'No responses found' : `Showing ${filteredResponses.length} response(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No responses found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Respondent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response) => (
                    <TableRow key={response.id}>
                      <TableCell>
                        <Badge variant="secondary">
                          {response.form_title || 'Unknown Form'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getRespondentName(response) || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getRespondentEmail(response)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(response.submitted_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedResponse(response)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
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

      {/* Response Detail Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Response Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedResponse(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="font-medium">Form:</label>
                <p>{selectedResponse.form_title}</p>
              </div>
              
              <div>
                <label className="font-medium">Respondent:</label>
                <p>{getRespondentName(selectedResponse) || 'Anonymous'}</p>
              </div>
              
              <div>
                <label className="font-medium">Email:</label>
                <p>{getRespondentEmail(selectedResponse)}</p>
              </div>
              
              <div>
                <label className="font-medium">Submitted:</label>
                <p>{new Date(selectedResponse.submitted_at).toLocaleString()}</p>
              </div>
              
              <div>
                <label className="font-medium">Response Data:</label>
                <div className="bg-gray-50 p-4 rounded mt-2">
                  {formatResponseData(selectedResponse.response_data)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
