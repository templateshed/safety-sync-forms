import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormExporter } from '@/components/ui/form-exporter';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FormData {
  id: string;
  title: string;
  description?: string;
  status: string;
  schedule_type?: string;
  schedule_start_date?: string;
  schedule_end_date?: string;
  schedule_time?: string;
  business_days_only?: boolean;
  business_days?: number[];
}

interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  order_index: number;
  section_id?: string;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

export const FormExport: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (formId && user) {
      fetchFormData();
    }
  }, [formId, user]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
      return;
    }
    setUser(session.user);
  };

  const fetchFormData = async () => {
    if (!formId || !user) return;

    try {
      setLoading(true);

      // Fetch form data
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .eq('user_id', user.id)
        .single();

      if (formError) {
        if (formError.code === 'PGRST116') {
          toast({
            title: "Form not found",
            description: "This form does not exist or you don't have permission to access it",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        throw formError;
      }

      // Fetch form fields and sections
      const [fieldsResult, sectionsResult] = await Promise.all([
        supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId)
          .order('order_index'),
        supabase
          .from('form_sections')
          .select('*')
          .eq('form_id', formId)
          .order('order_index')
      ]);

      if (fieldsResult.error) throw fieldsResult.error;
      if (sectionsResult.error) throw sectionsResult.error;

      setForm({
        id: formData.id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        schedule_type: formData.schedule_type,
        schedule_start_date: formData.schedule_start_date,
        schedule_end_date: formData.schedule_end_date,
        schedule_time: formData.schedule_time,
        business_days_only: formData.business_days_only,
        business_days: Array.isArray(formData.business_days) ? formData.business_days as number[] : undefined,
      });
      setFields(fieldsResult.data || []);
      setSections(sectionsResult.data || []);
    } catch (error: any) {
      console.error('Error fetching form data:', error);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form data...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Form Not Found</h1>
              <p className="text-muted-foreground mb-4">
                This form does not exist or you don't have permission to access it.
              </p>
              <Button onClick={() => navigate('/')}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border"></div>
            <div>
              <h1 className="text-3xl font-bold">Export Form</h1>
              <p className="text-muted-foreground">Export "{form.title}" in multiple formats</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid gap-8">
            {/* Form Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Form Information</CardTitle>
                <CardDescription>
                  Overview of the form you're about to export
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-1">Form Title</h3>
                    <p className="text-muted-foreground">{form.title}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Status</h3>
                    <p className="text-muted-foreground capitalize">{form.status}</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Fields Count</h3>
                    <p className="text-muted-foreground">{fields.length} fields</p>
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Sections Count</h3>
                    <p className="text-muted-foreground">{sections.length} sections</p>
                  </div>
                  {form.description && (
                    <div className="md:col-span-2">
                      <h3 className="font-medium mb-1">Description</h3>
                      <p className="text-muted-foreground">{form.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>
                  Choose from multiple export formats including PDF, image, and JSON
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormExporter
                  form={form}
                  fields={fields}
                  sections={sections}
                  variant="default"
                  size="lg"
                />
              </CardContent>
            </Card>

            {/* Export Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Export Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      📄 PDF Export
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Perfect for printing, sharing with colleagues, or including in reports. 
                      Maintains professional formatting and is widely compatible.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      🖼️ Image Export
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Great for presentations, social media, or quick previews. 
                      High-resolution PNG format ensures clarity on all devices.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      📊 JSON Export
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Technical format for backups, migrations, or integrations. 
                      Contains all form structure and configuration data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};