
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
import { toast } from '@/components/ui/use-toast';
import { AuthForm } from '@/components/auth/AuthForm';
import { getFieldVisibility } from '@/utils/conditionalLogic';
import type { Database } from '@/integrations/supabase/types';

type FieldType = Database['public']['Enums']['field_type'];

interface ConditionalRule {
  id: string;
  trigger_field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  trigger_values: string[];
  action: 'show' | 'hide' | 'require' | 'unrequire';
}

interface ConditionalLogic {
  logic_operator: 'AND' | 'OR';
  rules: ConditionalRule[];
}

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
  conditional_logic?: ConditionalLogic;
}

// Helper function to safely parse conditional logic from database
const parseConditionalLogic = (conditionalLogic: any): ConditionalLogic | undefined => {
  if (!conditionalLogic) return undefined;
  
  try {
    // If it's already a proper ConditionalLogic object
    if (typeof conditionalLogic === 'object' && conditionalLogic.logic_operator && conditionalLogic.rules) {
      return conditionalLogic as ConditionalLogic;
    }
    
    // If it's a string, try to parse it
    if (typeof conditionalLogic === 'string') {
      const parsed = JSON.parse(conditionalLogic);
      if (parsed.logic_operator && parsed.rules) {
        return parsed as ConditionalLogic;
      }
    }
    
    return undefined;
  } catch (error) {
    console.error('Error parsing conditional logic:', error);
    return undefined;
  }
};

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
        order_index: field.order_index,
        conditional_logic: parseConditionalLogic(field.conditional_logic)
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
    const visibleFields = fields.filter(field => {
      const { visible } = getFieldVisibility(field.id, field.conditional_logic, responses);
      return visible;
    });

    const requiredFields = visibleFields.filter(field => {
      const { required } = getFieldVisibility(field.id, field.conditional_logic, responses);
      return field.required || required;
    });

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
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'select':
        const selectOptions = field.options?.choices || [];
        return (
          <Select
            value={value}
            onValueChange={(newValue) => handleFieldChange(field.id, newValue)}
          >
            <SelectTrigger>
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
          >
            {radioOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        const checkboxOptions = field.options?.choices || [];
        const selectedValues = Array.isArray(value) ? value : [];
        
        return (
          <div className="space-y-2">
            {checkboxOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
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
                <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
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
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication form if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="mb-6">
              <CardHeader className="text-center">
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
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
              <p className="text-gray-600">
                This form does not exist or is not currently published.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
              <p className="text-gray-600">Your response has been submitted successfully.</p>
              <p className="text-sm text-gray-500 mt-2">Logged in as: {user?.email}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{form?.title}</CardTitle>
                {form?.description && (
                  <CardDescription className="text-base">{form.description}</CardDescription>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Logged in as:</p>
                <p className="text-sm font-medium text-gray-700">{user?.email}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => supabase.auth.signOut()}
                  className="mt-1"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                This form has no fields configured.
              </p>
            ) : (
              <>
                {fields.map((field) => {
                  const { visible, required } = getFieldVisibility(field.id, field.conditional_logic, responses);
                  
                  if (!visible) {
                    return null;
                  }

                  const isFieldRequired = field.required || required;

                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {isFieldRequired && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  );
                })}
                
                <div className="pt-4">
                  <Button 
                    onClick={submitForm} 
                    disabled={submitting}
                    className="w-full"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
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
