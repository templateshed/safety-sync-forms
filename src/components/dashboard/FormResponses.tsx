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

interface FormResponse {
  id: string;
  form_id: string;
  respondent_email: string | null;
  response_data: any;
  submitted_at: string;
  respondent_user_id: string | null;
  forms: {
    title: string;
  };
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface Form {
  id: string;
  title: string;
}

export const FormResponses = () => {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);

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
      console.log('Fetching responses...');
      
      // First get the basic form responses with forms data
      let query = supabase
        .from('form_responses')
        .select(`
          *,
          forms!inner(title)
        `)
        .order('submitted_at', { ascending: false });

      // Filter by form if selected
      if (selectedForm !== 'all') {
        query = query.eq('form_id', selectedForm);
      }

      // Filter by date range
      if (dateFrom) {
        query = query.gte('submitted_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('submitted_at', dateTo + 'T23:59:59');
      }

      const { data: responsesData, error: responsesError } = await query;

      if (responsesError) throw responsesError;
      
      console.log('Raw responses data:', responsesData);
      
      // Filter out any responses where the forms join failed
      const validResponses = (responsesData || []).filter(response => 
        response.forms && typeof response.forms === 'object' && response.forms.title
      );

      console.log('Valid responses:', validResponses);

      // Now fetch profiles separately for users who have them
      const userIds = validResponses
        .filter(r => r.respondent_user_id)
        .map(r => r.respondent_user_id);

      console.log('User IDs to fetch profiles for:', userIds);

      let profilesMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        console.log('Profiles data:', profilesData);
        console.log('Profiles error:', profilesError);

        if (!profilesError && profilesData) {
          profilesData.forEach(profile => {
            profilesMap.set(profile.id, {
              first_name: profile.first_name,
              last_name: profile.last_name
            });
          });
        }
      }

      console.log('Profiles map:', profilesMap);

      // Combine the data
      const enrichedResponses = validResponses.map(response => {
        const profile = response.respondent_user_id ? profilesMap.get(response.respondent_user_id) : null;
        console.log(`Response ${response.id}: user_id=${response.respondent_user_id}, email=${response.respondent_email}, profile=`, profile);
        
        return {
          ...response,
          profiles: profile || null
        };
      });
      
      console.log('Final enriched responses:', enrichedResponses);
      setResponses(enrichedResponses);
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
    const formTitle = response.forms?.title?.toLowerCase() || '';
    const email = getRespondentEmail(response).toLowerCase();
    
    return formTitle.includes(searchLower) || 
           email.includes(searchLower);
  });

  const getRespondentEmail = (response: FormResponse) => {
    console.log('Getting email for response:', response.id, 'respondent_email:', response.respondent_email);
    
    // Check if we have a direct email from the response
    if (response.respondent_email) {
      return response.respondent_email;
    }
    
    // If we have a user_id but no email, we could fetch it from auth
    // For now, return a placeholder indicating we have a user but no email captured
    if (response.respondent_user_id) {
      return 'Authenticated User';
    }
    
    return 'Anonymous';
  };

  const getRespondentName = (response: FormResponse) => {
    console.log('Getting name for response:', response.id, 'profiles:', response.profiles);
    
    if (response.profiles?.first_name && response.profiles?.last_name) {
      return `${response.profiles.first_name} ${response.profiles.last_name}`;
    } else if (response.profiles?.first_name) {
      return response.profiles.first_name;
    } else if (response.profiles?.last_name) {
      return response.profiles.last_name;
    }
    return null;
  };

  const exportResponses = () => {
    const csvContent = [
      ['Form', 'Email', 'Name', 'Submitted At', 'Response Data'],
      ...filteredResponses.map(response => [
        response.forms?.title || 'Unknown Form',
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
                          {response.forms?.title || 'Unknown Form'}
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
                <p>{selectedResponse.forms?.title}</p>
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
