
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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { parseFormIdentifier, isValidShortCode } from '@/utils/shortCode';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { SignatureField } from '@/components/ui/signature-field';
import { DatePicker } from '@/components/ui/date-picker';
import { useSecureValidation } from '@/components/ui/security-wrapper';
import type { Database } from '@/integrations/supabase/types';

type FieldType = Database['public']['Enums']['field_type'];

interface FormData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  allow_anonymous: boolean;
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
  const { validateFormData, sanitizeFormData } = useSecureValidation();
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLateSubmission, setIsLateSubmission] = useState(false);
  const [intendedSubmissionDate, setIntendedSubmissionDate] = useState<Date | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(30);
  const [visitorEmail, setVisitorEmail] = useState('');

  useEffect(() => {
    // Check authentication status (optional for anonymous forms)
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (formId) {
      fetchForm();
    }
  }, [formId]);

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

  // Removed access code logic

  const fetchForm = async () => {
    if (!formId) return;

    try {
      console.log('Fetching form with ID:', formId);
      
      // Parse the form identifier to determine if it's a UUID or short code
      const identifier = parseFormIdentifier(formId);
      
      let formQuery = supabase
        .from('forms')
        .select('id, title, description, status, allow_anonymous, schedule_type, schedule_start_date, schedule_end_date, schedule_time, short_code');

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

      // Calculate intended submission date and check if this is a late submission
      if (formData.schedule_start_date) {
        const scheduleStartDate = new Date(formData.schedule_start_date);
        const currentDate = new Date();
        
        // Get the scheduled time from the form, defaulting to 9:00 AM
        const scheduleTime = (formData as any).schedule_time || '09:00:00';
        const [hours, minutes, seconds] = scheduleTime.split(':').map(Number);
        
        // For now, use simple logic - intended date is the schedule start date
        let intendedDate = new Date(scheduleStartDate);
        intendedDate.setHours(hours, minutes, seconds || 0, 0);
        
        if (formData.schedule_type === 'daily') {
          // For daily forms, intended date is today if after start date
          if (currentDate >= scheduleStartDate) {
            intendedDate = new Date();
            intendedDate.setHours(hours, minutes, seconds || 0, 0);
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

      // Fetch form sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_id', formData.id)
        .order('order_index');

      if (sectionsError) {
        console.error('Sections fetch error:', sectionsError);
        throw sectionsError;
      }

      console.log('Form fields fetched:', fieldsData);
      console.log('Form sections fetched:', sectionsData);

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
        conditional_logic: field.conditional_logic,
        section_id: field.section_id
      }));
      
      setFields(transformedFields);
      setSections(sectionsData || []);
      
      // Auto-populate Today's Date field if it exists
      const todaysDateField = transformedFields.find(field => 
        field.id === 'todays-date-field' || field.label === "Today's Date"
      );
      
      if (todaysDateField) {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const todayFormatted = `${year}-${month}-${day}`; // Format as YYYY-MM-DD
        setResponses(prev => ({
          ...prev,
          [todaysDateField.id]: todayFormatted
        }));
      }
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
    // For anonymous submissions, require visitor email if no user is logged in
    if (!user && !visitorEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please provide your email address to submit this form.",
        variant: "destructive",
      });
      return false;
    }

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
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      console.log('Submitting form response:', responses);
      
      // Security validation
      const { isValid, errors } = validateFormData(responses);
      if (!isValid) {
        toast({
          title: "Security Validation Failed",
          description: "The form data contains invalid content. Please check your inputs and try again.",
          variant: "destructive",
        });
        console.error('Form validation errors:', errors);
        return;
      }

      // Sanitize the form data
      const sanitizedResponses = sanitizeFormData(responses);
      
      // Prepare the submission data - support both authenticated and anonymous users
      const submissionData = {
        form_id: form!.id,
        response_data: sanitizedResponses as any, // Type assertion for Supabase Json type
        respondent_user_id: user?.id || null, // Use actual user ID if authenticated
        respondent_email: user?.email || visitorEmail, // Use user email or visitor email
        ip_address: null,
        user_agent: navigator.userAgent.substring(0, 500), // Limit user agent length
      };

      console.log('Form object:', form);
      console.log('Submission data:', submissionData);
      console.log('User context:', user);

      let responseData, error;
      
      if (user?.id) {
        // For authenticated users, insert directly to preserve user context
        const { data, error: insertError } = await supabase
          .from('form_responses')
          .insert(submissionData)
          .select('id')
          .single();
        
        responseData = data?.id;
        error = insertError;
      } else {
        // Use the security definer function for anonymous submissions
        const { data, error: rpcError } = await supabase.rpc('insert_anonymous_form_response', {
          p_form_id: submissionData.form_id,
          p_response_data: submissionData.response_data,
          p_respondent_email: submissionData.respondent_email,
          p_ip_address: submissionData.ip_address,
          p_user_agent: submissionData.user_agent
        });
        
        responseData = data;
        error = rpcError;
      }

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
            response_id: responseData, // responseData is now the UUID directly from the function
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
    const isTodaysDateField = field.id === 'todays-date-field' || field.label === "Today's Date";

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
        const dateValue = value ? new Date(`${value}T12:00:00`) : undefined;
        return (
          <DatePicker
            date={dateValue}
            onSelect={(date) => {
              if (date) {
                // Format date as YYYY-MM-DD for consistency with form data, avoiding timezone issues
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                handleFieldChange(field.id, formattedDate);
              } else {
                handleFieldChange(field.id, '');
              }
            }}
            placeholder={field.placeholder || 'Select a date'}
            disabled={isTodaysDateField} // Disable Today's Date field from being changed
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

  const groupFieldsBySection = () => {
    const grouped: { [sectionId: string]: FormField[] } = {};
    const unsectioned: FormField[] = [];

    fields.forEach(field => {
      if (field.section_id) {
        if (!grouped[field.section_id]) {
          grouped[field.section_id] = [];
        }
        grouped[field.section_id].push(field);
      } else {
        unsectioned.push(field);
      }
    });

    return { grouped, unsectioned };
  };

  // Check if authentication is required for this form
  if (form && !form.allow_anonymous && !user) {
    return <AuthForm />;
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
              <p className="text-sm text-gray-500 mb-6">
                {user ? `Logged in as: ${user.email}` : `Submitted as: ${visitorEmail}`}
              </p>
              
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
              {user && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Logged in as:</p>
                  <p className="text-sm font-medium text-gray-700">{user.email}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => supabase.auth.signOut()}
                    className="mt-1"
                  >
                    Sign Out
                  </Button>
                </div>
              )}
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
                  {intendedSubmissionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                {(() => {
                  const { grouped, unsectioned } = groupFieldsBySection();
                  
                  return (
                    <>
                      {/* Unsectioned fields */}
                      {unsectioned.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderField(field)}
                        </div>
                      ))}
                      
                      {/* Sectioned fields */}
                      {sections.map(section => {
                        const sectionFields = grouped[section.id] || [];
                        if (sectionFields.length === 0) return null;

                        return (
                          <div key={section.id} className="border rounded-lg p-4 bg-muted/30">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                              {section.description && (
                                <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                              )}
                            </div>
                            <div className="space-y-4">
                              {sectionFields.map((field) => (
                                <div key={field.id} className="space-y-2">
                                  <Label htmlFor={field.id}>
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </Label>
                                  {renderField(field)}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
                
                {/* Email input for anonymous users */}
                {!user && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="visitor-email">
                      Your Email Address
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="visitor-email"
                      type="email"
                      value={visitorEmail}
                      onChange={(e) => setVisitorEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      This email will be used to identify your submission
                    </p>
                  </div>
                )}
                
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
