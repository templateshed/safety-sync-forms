
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

  useEffect(() => {
    fetchForms();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [selectedForm, dateRange]);

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

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
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
      setMetrics(data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
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
    return metrics
      .filter(m => m.metric_name === metricName)
      .reduce((sum, m) => sum + m.metric_value, 0);
  };

  const getMetricTrend = (metricName: string): ChartData[] => {
    const metricsByDate = metrics
      .filter(m => m.metric_name === metricName)
      .reduce((acc, m) => {
        const date = new Date(m.recorded_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + m.metric_value;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(metricsByDate)
      .map(([date, value]) => ({ name: date, value, date }))
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  };

  const getFormMetrics = (): ChartData[] => {
    const formMetrics = metrics.reduce((acc, m) => {
      const formTitle = m.forms?.title || 'Unknown Form';
      acc[formTitle] = (acc[formTitle] || 0) + m.metric_value;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(formMetrics)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 forms
  };

  const getMetricsByType = (): ChartData[] => {
    const metricTypes = metrics.reduce((acc, m) => {
      acc[m.metric_name] = (acc[m.metric_name] || 0) + m.metric_value;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(metricTypes)
      .map(([name, value]) => ({ name, value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalViews = calculateTotalMetric('views');
  const totalResponses = calculateTotalMetric('responses');
  const totalSubmissions = calculateTotalMetric('submissions');
  const avgCompletionRate = metrics.length > 0 ? 
    (calculateTotalMetric('completion_rate') / metrics.filter(m => m.metric_name === 'completion_rate').length) || 0 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
          <p className="text-muted-foreground">
            Monitor your form performance and user engagement
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <label className="text-sm font-medium">Time Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Form page views
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Form responses received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Successfully submitted forms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Average form completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Response Trend</CardTitle>
            <CardDescription>Daily response count over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getMetricTrend('responses')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-responses)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Form Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Forms</CardTitle>
            <CardDescription>Forms by total activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getFormMetrics()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Metrics Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Metrics Distribution</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle>Views Trend</CardTitle>
            <CardDescription>Daily page views over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getMetricTrend('views')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-views)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest analytics events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.slice(0, 10).map((metric, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{metric.metric_name}</Badge>
                    <span className="text-sm">{metric.forms?.title || 'Unknown Form'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{metric.metric_value}</span>
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

      {metrics.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No analytics data found for the selected criteria.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Analytics data will appear here as users interact with your forms.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
