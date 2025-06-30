
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { AuthForm } from '@/components/auth/AuthForm';
import { CheckCircle, User, LogOut } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type FieldType = Database['public']['Enums']['field_type'];

interface FormData {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

interface FormField {
  id: string;
  field_type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  order_index: number;
}

export const PublicFormViewer: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setAuthLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (formId && user) {
      fetchForm();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [formId, user, authLoading]);

  const fetchForm = async () => {
    if (!formId || !user) return;

    try {
      console.log('Fetching form with ID:', formId);
      
      // Fetch form details - now requires authentication
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('id, title, description, status')
        .eq('id', formId)
        .eq('status', 'published')
        .single();

      if (formError) {
        console.error('Form fetch error:', formError);
        if (formError.code === 'PGRST116') {
          toast({
            title: "Form not found",
            description: "This form does not exist or is not published",
            variant: "destructive",
          });
          return;
        }
        throw formError;
      }

      console.log('Form data fetched:', formData);

      // Fetch form fields - now requires authentication
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (fieldsError) {
        console.error('Fields fetch error:', fieldsError);
        throw fieldsError;
      }

      console.log('Form fields fetched:', fieldsData);

      setForm(formData);
      
      // Transform the database fields to match our FormField interface
      const transformedFields: FormField[] = (fieldsData || []).map(field => ({
        id: field.id,
        field_type: field.field_type,
        label: field.label,
        placeholder: field.placeholder || undefined,
        required: field.required || false,
        options: field.options,
        order_index: field.order_index
      }));
      
      setFields(transformedFields);
    } catch (error: any) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Failed to load form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateForm = () => {
    const requiredFields = fields.filter(field => field.required);

    const missingFields = requiredFields.filter(field => 
      !responses[field.id] || 
      (typeof responses[field.id] === 'string' && responses[field.id].trim() === '') ||
      (Array.isArray(responses[field.id]) && responses[field.id].length === 0)
    );

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const submitForm = async () => {
    if (!validateForm() || !user) return;

    setSubmitting(true);
    try {
      console.log('Submitting form response:', responses);
      
      // Submit form response with authenticated user ID
      const { error } = await supabase
        .from('form_responses')
        .insert({
          form_id: formId,
          response_data: responses,
          respondent_user_id: user.id,
          ip_address: null,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Form submission error:', error);
        throw error;
      }

      console.log('Form submitted successfully');
      setSubmitted(true);
      toast({
        title: "Success",
        description: "Your response has been submitted successfully!",
      });
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit form response",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input
            type={field.field_type}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20 min-h-[100px]"
          />
        );

      case 'select':
        const selectOptions = field.options?.choices || [];
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
          >
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option: string, index: number) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        const radioOptions = field.options?.choices || [];
        return (
          <RadioGroup
            value={value}
            onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
            className="space-y-3"
          >
            {radioOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`} className="cursor-pointer flex-1">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        const checkboxOptions = field.options?.choices || [];
        const selectedValues = Array.isArray(value) ? value : [];
        
        return (
          <div className="space-y-3">
            {checkboxOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`${field.id}-${index}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFieldChange(field.id, [...selectedValues, option]);
                    } else {
                      handleFieldChange(field.id, selectedValues.filter((v: string) => v !== option));
                    }
                  }}
                />
                <Label htmlFor={`${field.id}-${index}`} className="cursor-pointer flex-1 leading-relaxed">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
          />
        );
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="mb-6 shadow-lg border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Authentication Required</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  You must be logged in to access this form. Please sign in or create an account to continue.
                </CardDescription>
              </CardHeader>
            </Card>
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Form Not Found</h1>
            <p className="text-muted-foreground">
              This form does not exist or is not currently published.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Thank You!</h1>
            <p className="text-muted-foreground mb-4">Your response has been submitted successfully.</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-4">
              <User className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-3">{form?.title}</CardTitle>
                {form?.description && (
                  <CardDescription className="text-base leading-relaxed">{form.description}</CardDescription>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  <span>{user?.email}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-xs"
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {fields.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  This form has no fields configured.
                </p>
              </div>
            ) : (
              <>
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-3">
                    <Label htmlFor={field.id} className="text-base font-medium">
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
                
                <div className="pt-6 border-t border-border">
                  <Button 
                    onClick={submitForm} 
                    disabled={submitting}
                    className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 transition-all duration-200"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Response'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
