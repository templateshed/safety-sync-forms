
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Filter, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FormResponse {
  id: string;
  form_id: string;
  respondent_email: string | null;
  response_data: any;
  submitted_at: string;
  ip_address: string | null;
  user_agent: string | null;
  forms: {
    title: string;
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
      let query = supabase
        .from('form_responses')
        .select(`
          *,
          forms (title)
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

      const { data, error } = await query;

      if (error) throw error;
      setResponses(data || []);
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
    const email = response.respondent_email?.toLowerCase() || '';
    const responseText = JSON.stringify(response.response_data).toLowerCase();
    
    return formTitle.includes(searchLower) || 
           email.includes(searchLower) || 
           responseText.includes(searchLower);
  });

  const exportResponses = () => {
    const csvContent = [
      ['Form', 'Email', 'Submitted At', 'Response Data'],
      ...filteredResponses.map(response => [
        response.forms?.title || 'Unknown Form',
        response.respondent_email || 'Anonymous',
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
                    <TableHead>Email</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Response Data</TableHead>
                    <TableHead>IP Address</TableHead>
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
                        {response.respondent_email || (
                          <span className="text-muted-foreground">Anonymous</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                          {new Date(response.submitted_at).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm">
                          {formatResponseData(response.response_data)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {response.ip_address || 'N/A'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
