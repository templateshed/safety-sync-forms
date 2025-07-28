
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Save, X, History } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: any;
  order_index: number;
  section_id?: string;
  placeholder?: string;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

interface FormSignature {
  id: string;
  field_id: string;
  signature_data: string;
  signature_type: string;
  typed_name?: string;
}

interface FormResponseWithUserData {
  id: string;
  form_id: string;
  respondent_email: string | null;
  response_data: any;
  submitted_at: string;
  updated_at?: string;
  updated_by?: string;
  edit_history?: any[];
  form_title: string;
  first_name: string | null;
  last_name: string | null;
  effective_email: string | null;
}

interface ResponseFormViewerProps {
  response: FormResponseWithUserData;
  onClose: () => void;
  onSave: () => void;
}

export const ResponseFormViewer: React.FC<ResponseFormViewerProps> = ({
  response,
  onClose,
  onSave
}) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [signatures, setSignatures] = useState<FormSignature[]>([]);
  const [responseData, setResponseData] = useState<any>(response.response_data || {});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchFormStructure();
  }, [response.form_id]);

  const fetchFormStructure = async () => {
    try {
      // Fetch form fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', response.form_id)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      // Parse options field for each field if it exists
      const parsedFieldsData = fieldsData?.map(field => {
        let options = [];
        
        if (field.options) {
          try {
            if (typeof field.options === 'string') {
              const parsed = JSON.parse(field.options);
              options = Array.isArray(parsed) ? parsed : [];
            } else if (Array.isArray(field.options)) {
              options = field.options;
            }
          } catch (error) {
            console.warn('Failed to parse options for field:', field.id, error);
            options = [];
          }
        }
        
        return {
          ...field,
          options
        };
      }) || [];

      // Fetch form sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_id', response.form_id)
        .order('order_index');

      if (sectionsError) throw sectionsError;

      // Fetch signatures for this response
      const { data: signaturesData, error: signaturesError } = await supabase
        .from('form_signatures')
        .select('*')
        .eq('response_id', response.id);

      if (signaturesError) throw signaturesError;

      setFields(parsedFieldsData);
      setSections(sectionsData || []);
      setSignatures(signaturesData || []);
    } catch (error) {
      console.error('Error fetching form structure:', error);
      toast({
        title: "Error",
        description: "Failed to load form structure",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponseData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('form_responses')
        .update({
          response_data: responseData
        })
        .eq('id', response.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Response updated successfully",
      });

      onSave();
    } catch (error) {
      console.error('Error saving response:', error);
      toast({
        title: "Error",
        description: "Failed to save response",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = responseData[field.id] || '';

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
            className="w-full"
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full min-h-[100px]"
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(value) => handleFieldChange(field.id, value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string, index: number) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <RadioGroup value={value} onValueChange={(value) => handleFieldChange(field.id, value)}>
            {field.options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        const checkboxValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${index}`}
                  checked={checkboxValues.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleFieldChange(field.id, [...checkboxValues, option]);
                    } else {
                      handleFieldChange(field.id, checkboxValues.filter(v => v !== option));
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
            className="w-full"
          />
        );

      case 'signature':
        const signature = signatures.find(sig => sig.field_id === field.id);
        
        if (signature) {
          return (
            <div className="space-y-2">
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Signature ({signature.signature_type})
                  </span>
                  {signature.typed_name && (
                    <span className="text-sm text-gray-500">
                      Name: {signature.typed_name}
                    </span>
                  )}
                </div>
                <img 
                  src={signature.signature_data} 
                  alt="Signature" 
                  className="max-w-full h-auto border rounded"
                  style={{ maxHeight: '150px' }}
                />
              </div>
            </div>
          );
        } else {
          return (
            <div className="border rounded-lg p-4 bg-gray-50 text-center text-gray-500">
              No signature provided
            </div>
          );
        }

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="w-full"
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-center mt-2">Loading form...</p>
        </div>
      </div>
    );
  }

  const { grouped, unsectioned } = groupFieldsBySection();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{response.form_title}</h2>
            <p className="text-muted-foreground">
              Submitted by {response.effective_email} on {new Date(response.submitted_at).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {response.edit_history && response.edit_history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="brand-gradient"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {showHistory && response.edit_history && response.edit_history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Edit History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {response.edit_history.map((entry: any, index: number) => (
                    <div key={index} className="text-sm border-l-2 border-primary pl-3">
                      <p className="font-medium">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">{entry.changes}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unsectioned fields */}
          {unsectioned.length > 0 && (
            <div className="space-y-4">
              {unsectioned.map(field => (
                <div key={field.id} className="space-y-2">
                  <Label className="text-foreground font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          )}

          {/* Sectioned fields */}
          {sections.map(section => {
            const sectionFields = grouped[section.id] || [];
            if (sectionFields.length === 0) return null;

            return (
              <Card key={section.id}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  {section.description && (
                    <p className="text-muted-foreground">{section.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {sectionFields.map(field => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-foreground font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {renderField(field)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
