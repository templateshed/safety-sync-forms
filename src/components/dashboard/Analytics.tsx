
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users, FileText, Calendar, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Form {
  id: string;
  title: string;
}

interface MetricData {
  form_id: string;
  metric_name: string;
  metric_value: number;
  recorded_at: string;
  forms?: {
    title: string;
  };
}

interface ChartData {
  name: string;
  value: number;
  date?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
  responses: {
    label: "Responses",
    color: "hsl(var(--chart-2))",
  },
  views: {
    label: "Views",
    color: "hsl(var(--chart-3))",
  },
};

export const Analytics = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>('all');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('7');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [selectedForm, dateRange]);

  const fetchForms = async () => {
    try {
      console.log('Fetching forms...');
      const { data, error } = await supabase
        .from('forms')
        .select('id, title')
        .order('title');

      if (error) throw error;
      console.log('Forms fetched:', data);
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

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching metrics with filters:', { selectedForm, dateRange });
      
      // Calculate date filter
      const daysAgo = parseInt(dateRange);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysAgo);

      let query = supabase
        .from('form_analytics')
        .select(`
          *,
          forms (title)
        `)
        .gte('recorded_at', fromDate.toISOString())
        .order('recorded_at', { ascending: false });

      // Filter by form if selected
      if (selectedForm !== 'all') {
        query = query.eq('form_id', selectedForm);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      console.log('Analytics data fetched:', data);
      console.log('Number of metrics:', data?.length || 0);
      
      // If no data found, let's also check if there's any data in the table at all
      if (!data || data.length === 0) {
        const { data: allData, error: allError } = await supabase
          .from('form_analytics')
          .select('*')
          .limit(5);
        
        console.log('Sample of all analytics data:', allData);
        if (allError) console.error('Error fetching sample data:', allError);
      }
      
      setMetrics(data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError('Failed to fetch analytics data');
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalMetric = (metricName: string): number => {
    const total = metrics
      .filter(m => m.metric_name === metricName)
      .reduce((sum, m) => sum + m.metric_value, 0);
    console.log(`Total ${metricName}:`, total);
    return total;
  };

  const getMetricTrend = (metricName: string): ChartData[] => {
    console.log(`Getting trend for ${metricName}`);
    const relevantMetrics = metrics.filter(m => m.metric_name === metricName);
    console.log(`Found ${relevantMetrics.length} metrics for ${metricName}`);
    
    const metricsByDate = relevantMetrics.reduce((acc, m) => {
      const date = new Date(m.recorded_at).toLocaleDateString();
      acc[date] = (acc[date] || 0) + m.metric_value;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(metricsByDate)
      .map(([date, value]) => ({ name: date, value, date }))
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    
    console.log(`Trend data for ${metricName}:`, result);
    return result;
  };

  const getFormMetrics = (): ChartData[] => {
    console.log('Getting form metrics');
    const formMetrics = metrics.reduce((acc, m) => {
      const formTitle = m.forms?.title || 'Unknown Form';
      acc[formTitle] = (acc[formTitle] || 0) + m.metric_value;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(formMetrics)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 forms
    
    console.log('Form metrics:', result);
    return result;
  };

  const getMetricsByType = (): ChartData[] => {
    console.log('Getting metrics by type');
    const metricTypes = metrics.reduce((acc, m) => {
      acc[m.metric_name] = (acc[m.metric_name] || 0) + m.metric_value;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(metricTypes)
      .map(([name, value]) => ({ name, value }));
    
    console.log('Metrics by type:', result);
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalViews = calculateTotalMetric('views');
  const totalResponses = calculateTotalMetric('responses');
  const totalSubmissions = calculateTotalMetric('submissions');
  
  // Fix the completion rate calculation
  const completionRateMetrics = metrics.filter(m => m.metric_name === 'completion_rate');
  const avgCompletionRate = completionRateMetrics.length > 0 ? 
    (completionRateMetrics.reduce((sum, m) => sum + m.metric_value, 0) / completionRateMetrics.length) : 0;

  console.log('Calculated metrics:', {
    totalViews,
    totalResponses,
    totalSubmissions,
    avgCompletionRate,
    metricsCount: metrics.length
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h2>
          <p className="text-muted-foreground">
            Monitor your form performance and user engagement
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center text-foreground">
            <BarChart3 className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="text-sm font-medium text-foreground">Time Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Show error state */}
      {error && (
        <Card className="glass-effect border-destructive">
          <CardContent className="text-center py-8">
            <p className="text-destructive">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please try refreshing the page or contact support if the issue persists.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Views</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Form page views
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalResponses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Form responses received
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Submissions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalSubmissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Successfully submitted forms
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Avg. Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{avgCompletionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average form completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {metrics.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Trend */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-foreground">Response Trend</CardTitle>
              <CardDescription>Daily response count over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getMetricTrend('responses')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-responses)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Form Performance */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-foreground">Top Performing Forms</CardTitle>
              <CardDescription>Forms by total activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getFormMetrics()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Metrics Distribution */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-foreground">Metrics Distribution</CardTitle>
              <CardDescription>Breakdown by metric type</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getMetricsByType()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getMetricsByType().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Views Trend */}
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle className="text-foreground">Views Trend</CardTitle>
              <CardDescription>Daily page views over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getMetricTrend('views')}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-views)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Recent Activity */}
      {metrics.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription>Latest analytics events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.slice(0, 10).map((metric, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="border-border">{metric.metric_name}</Badge>
                    <span className="text-sm text-foreground">{metric.forms?.title || 'Unknown Form'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-foreground">{metric.metric_value}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(metric.recorded_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {metrics.length === 0 && !loading && !error && (
        <Card className="glass-effect">
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No analytics data found for the selected criteria.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Analytics data will appear here as users interact with your forms.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Debug info: Found {forms.length} forms. Check console for more details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
