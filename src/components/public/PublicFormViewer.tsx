
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { AuthForm } from '@/components/auth/AuthForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock } from 'lucide-react';
import { parseFormIdentifier, isValidShortCode } from '@/utils/shortCode';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SignatureField } from '@/components/ui/signature-field';
import { DatePicker } from '@/components/ui/date-picker';
import type { Database } from '@/integrations/supabase/types';

type FieldType = Database['public']['Enums']['field_type'];

interface FormData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  schedule_type: string | null;
  schedule_start_date: string | null;
  schedule_end_date: string | null;
}

interface FormField {
  id: string;
  field_type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  order_index: number;
  conditional_logic?: any;
}

interface PublicFormViewerProps {
  formId?: string;
  onFormSubmitted?: () => Promise<void>;
  isOverdueAccess?: boolean;
}

export const PublicFormViewer: React.FC<PublicFormViewerProps> = ({ 
  formId: propFormId, 
  onFormSubmitted, 
  isOverdueAccess = false 
}) => {
  const { formId: paramFormId } = useParams<{ formId: string }>();
  const formId = propFormId || paramFormId;
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLateSubmission, setIsLateSubmission] = useState(false);
  const [intendedSubmissionDate, setIntendedSubmissionDate] = useState<Date | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(30);

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

  useEffect(() => {
    if (submitted) {
      const interval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [submitted, navigate]);

  const checkIfAccessCode = async (possibleAccessCode: string) => {
    try {
      console.log('Checking if this is an access code:', possibleAccessCode);
      
      // Check if this is a valid access code
      const { data, error } = await supabase.rpc('get_form_by_access_code', {
        code: possibleAccessCode
      });

      if (error) {
        console.error('Error checking access code:', error);
        return;
      }

      if (data && data.length > 0) {
        // This is a valid access code - redirect to the correct route
        const correctUrl = `/form/overdue/${possibleAccessCode}`;
        console.log('Redirecting to correct overdue form URL:', correctUrl);
        
        toast({
          title: "Redirecting to Overdue Form",
          description: "This appears to be an overdue form access code. Redirecting you to the correct page...",
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate(correctUrl);
        }, 1500);
        return;
      }
    } catch (error) {
      console.error('Error checking access code:', error);
    }
  };

  const fetchForm = async () => {
    if (!formId || !user) return;

    try {
      console.log('Fetching form with ID:', formId);
      
      // Parse the form identifier to determine if it's a UUID or short code
      const identifier = parseFormIdentifier(formId);
      
      let formQuery = supabase
        .from('forms')
        .select('id, title, description, status, schedule_type, schedule_start_date, schedule_end_date, short_code');

      // For overdue access, we don't check if the form is published
      if (!isOverdueAccess) {
        formQuery = formQuery.eq('status', 'published');
      }

      // Build query based on identifier type
      if (identifier.type === 'uuid') {
        formQuery = formQuery.eq('id', identifier.value);
      } else if (identifier.type === 'short_code') {
        formQuery = formQuery.eq('short_code', identifier.value);
      } else {
        throw new Error('Invalid form identifier format');
      }

      const { data: formData, error: formError } = await formQuery.single();

      if (formError) {
        console.error('Form fetch error:', formError);
        if (formError.code === 'PGRST116') {
          // Check if this might be an access code instead of a form identifier
          const isAccessCodeFormat = identifier.type === 'short_code';
          
          if (isAccessCodeFormat && !isOverdueAccess) {
            // This might be an access code used in the wrong route
            await checkIfAccessCode(identifier.value);
            return;
          }
          
          toast({
            title: "Form not found",
            description: isOverdueAccess 
              ? "This form does not exist or the access code is invalid"
              : "This form does not exist or is not published",
            variant: "destructive",
          });
          return;
        }
        throw formError;
      }

      console.log('Form data fetched:', formData);

      // Calculate intended submission date and check if this is a late submission
      if (formData.schedule_start_date) {
        const scheduleStartDate = new Date(formData.schedule_start_date);
        const currentDate = new Date();
        
        // For now, use simple logic - intended date is the schedule start date
        // This will be enhanced when the database function is properly available
        let intendedDate = scheduleStartDate;
        
        if (formData.schedule_type === 'daily') {
          // For daily forms, intended date is today if after start date
          if (currentDate >= scheduleStartDate) {
            intendedDate = new Date();
            intendedDate.setHours(scheduleStartDate.getHours(), scheduleStartDate.getMinutes(), 0, 0);
          }
        }
        
        setIntendedSubmissionDate(intendedDate);
        
        // Check if this is a late submission (current time is after intended date + grace period)
        const gracePeriodHours = 24; // 24 hour grace period
        const lateThreshold = new Date(intendedDate.getTime() + (gracePeriodHours * 60 * 60 * 1000));
        setIsLateSubmission(currentDate > lateThreshold);
      }

      // Fetch form fields using the actual form ID from the database
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formData.id)
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
        conditional_logic: field.conditional_logic
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
      
      // Prepare the submission data - only include columns that exist in the database
      const submissionData = {
        form_id: form!.id,
        response_data: responses,
        respondent_user_id: user.id,
        ip_address: null,
        user_agent: navigator.userAgent,
      };

      const { data: responseData, error } = await supabase
        .from('form_responses')
        .insert(submissionData)
        .select()
        .single();

      if (error) {
        console.error('Form submission error:', error);
        throw error;
      }

      // Handle signature fields separately
      const signatureFields = fields.filter(field => field.field_type === 'signature');
      
      for (const field of signatureFields) {
        const signatureData = responses[field.id];
        if (signatureData && signatureData.data) {
          const signatureSubmission = {
            response_id: responseData.id,
            field_id: field.id,
            signature_data: signatureData.data,
            signature_type: signatureData.type,
            typed_name: signatureData.typedName || null,
          };

          const { error: signatureError } = await supabase
            .from('form_signatures')
            .insert(signatureSubmission);

          if (signatureError) {
            console.error('Signature submission error:', signatureError);
            // Continue with other signatures even if one fails
          }
        }
      }

      console.log('Form submitted successfully');
      
      // Call the callback for overdue access forms
      if (onFormSubmitted) {
        await onFormSubmitted();
      }
      
      setSubmitted(true);
      toast({
        title: "Success",
        description: isOverdueAccess 
          ? "Your overdue form has been submitted successfully! The access code has been marked as used."
          : isLateSubmission 
          ? "Your late response has been submitted and will be reported with the original due date for compliance purposes."
          : "Your response has been submitted successfully!",
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

  const handleRedirectNow = () => {
    navigate('/');
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
        const dateValue = value ? new Date(value) : undefined;
        return (
          <DatePicker
            date={dateValue}
            onSelect={(date) => {
              if (date) {
                // Format date as YYYY-MM-DD for consistency with form data
                const formattedDate = date.toISOString().split('T')[0];
                handleFieldChange(field.id, formattedDate);
              } else {
                handleFieldChange(field.id, '');
              }
            }}
            placeholder={field.placeholder || 'Select a date'}
          />
        );

      case 'signature':
        return (
          <SignatureField
            value={value}
            onChange={(signatureValue) => handleFieldChange(field.id, signatureValue)}
            required={field.required}
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
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4">Form Not Found</h1>
              <p className="text-gray-600 mb-4">
                This form does not exist or is not currently published.
              </p>
              {formId && isValidShortCode(formId) && (
                <Alert className="text-left">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> If this is an overdue form access code, please use the correct URL format:
                    <br />
                    <code className="bg-gray-100 px-1 rounded mt-1 inline-block">
                      /form/overdue/{formId}
                    </code>
                  </AlertDescription>
                </Alert>
              )}
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
              <p className="text-gray-600 mb-4">
                {isLateSubmission 
                  ? "Your late response has been submitted and will be reported with the original due date for compliance purposes."
                  : "Your response has been submitted successfully."
                }
              </p>
              <p className="text-sm text-gray-500 mb-6">Logged in as: {user?.email}</p>
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    You will be redirected to the access form page in <span className="font-semibold">{redirectCountdown}</span> seconds
                  </p>
                </div>
                
                <Button 
                  onClick={handleRedirectNow}
                  className="w-full"
                >
                  Go to Access Form Now
                </Button>
              </div>
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

            {/* Late submission warning */}
            {isLateSubmission && (
              <Alert className="mt-4 border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Late Submission Notice:</strong> This form was due on{' '}
                  {intendedSubmissionDate?.toLocaleDateString()}. Your response will be recorded as submitted on time for compliance reporting purposes.
                </AlertDescription>
              </Alert>
            )}

            {/* Intended submission date info */}
            {intendedSubmissionDate && !isLateSubmission && (
              <Alert className="mt-4 border-blue-200 bg-blue-50">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Due date: {intendedSubmissionDate.toLocaleDateString()} at{' '}
                  {intendedSubmissionDate.toLocaleTimeString()}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                This form has no fields configured.
              </p>
            ) : (
              <>
                {fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
                
                <div className="pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        disabled={submitting}
                        className="w-full"
                      >
                        {submitting ? 'Submitting...' : isLateSubmission ? 'Submit Late Response' : 'Submit'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Submission</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to submit this form? Once submitted, you will not be able to make changes to your responses.
                          {isLateSubmission && (
                            <span className="block mt-2 text-amber-700 font-medium">
                              This is a late submission and will be noted in compliance reports.
                            </span>
                          )}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={submitForm} disabled={submitting}>
                          {submitting ? 'Submitting...' : 'Confirm Submit'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
