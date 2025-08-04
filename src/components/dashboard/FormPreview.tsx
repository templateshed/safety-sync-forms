import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { SignatureField } from '@/components/ui/signature-field';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { FormLogicEngine } from './FormLogicEngine';

type FieldType = Database['public']['Enums']['field_type'];

interface FormField {
  id: string;
  field_type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  order_index: number;
  section_id?: string;
  conditional_logic?: {
    enabled: boolean;
    rules: Array<{
      optionValue: string;
      goToTarget: string;
      targetType: 'field' | 'section';
    }>;
  };
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

interface FormPreviewProps {
  title: string;
  description: string;
  fields: FormField[];
  sections: FormSection[];
}

export const FormPreview: React.FC<FormPreviewProps> = ({
  title,
  description,
  fields,
  sections,
}) => {
  const [responses, setResponses] = useState<{ [key: string]: any }>({});
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Initialize logic engine immediately 
  const [logicEngine] = useState(() => {
    return new FormLogicEngine({
      fields,
      sections,
      responses: {},
    });
  });

  // Auto-populate Today's Date field and update logic engine
  React.useEffect(() => {
    const todaysDateField = fields.find(field => 
      field.id === 'todays-date-field' || field.label === "Today's Date"
    );
    
    if (todaysDateField) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      const todayFormatted = `${year}-${month}-${day}`;
      const newResponses = { [todaysDateField.id]: todayFormatted };
      setResponses(newResponses);
      logicEngine.updateResponses(newResponses);
    }
  }, [fields, sections, logicEngine]);

  const handleFieldChange = (fieldId: string, value: any) => {
    const newResponses = {
      ...responses,
      [fieldId]: value,
    };
    setResponses(newResponses);
    
    // Update logic engine with new responses
    if (logicEngine) {
      logicEngine.updateResponses(newResponses);
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const renderField = (field: FormField) => {
    const value = responses[field.id] || '';
    const isTodaysDateField = field.id === 'todays-date-field' || field.label === "Today's Date";

    switch (field.field_type) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            disabled={isTodaysDateField}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
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
            rows={4}
          />
        );

      case 'select':
        const selectOptions = field.options?.split('\n').filter((opt: string) => opt.trim()) || [];
        return (
          <Select onValueChange={(value) => handleFieldChange(field.id, value)} value={value}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option: string, index: number) => (
                <SelectItem key={index} value={option.trim()}>
                  {option.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        const radioOptions = field.options?.split('\n').filter((opt: string) => opt.trim()) || [];
        return (
          <RadioGroup onValueChange={(value) => handleFieldChange(field.id, value)} value={value}>
            {radioOptions.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option.trim()} id={`${field.id}-${index}`} />
                <Label htmlFor={`${field.id}-${index}`}>{option.trim()}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        const checkboxOptions = field.options?.split('\n').filter((opt: string) => opt.trim()) || [];
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
            disabled={isTodaysDateField}
          />
        );

      case 'time':
        return (
          <TimePicker
            time={value}
            onSelect={(time) => handleFieldChange(field.id, time)}
            placeholder={field.placeholder || 'Select a time'}
          />
        );

      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => handleFieldChange(field.id, e.target.files?.[0]?.name || '')}
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

  const { grouped, unsectioned } = groupFieldsBySection();
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="bg-gray-50 p-4 h-full overflow-y-auto">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">{title || 'Untitled Form'}</CardTitle>
          {description && (
            <CardDescription className="text-base">{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Render sections with their fields */}
          {sortedSections.map(section => {
            // Only show section if it's visible according to logic engine
            if (logicEngine && !logicEngine.isSectionVisible(section.id)) {
              return null;
            }

            const sectionFields = grouped[section.id]?.sort((a, b) => a.order_index - b.order_index) || [];
            const isCollapsed = collapsedSections.has(section.id);
            
            if (sectionFields.length === 0) return null;

            if (section.is_collapsible) {
              return (
                <Collapsible key={section.id} open={!isCollapsed} onOpenChange={() => toggleSectionCollapse(section.id)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{section.title}</CardTitle>
                            {section.description && (
                              <CardDescription>{section.description}</CardDescription>
                            )}
                          </div>
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="space-y-4">
                        {sectionFields
                          .filter(field => logicEngine ? logicEngine.isFieldVisible(field.id) : true)
                          .map(field => (
                            <div key={field.id} className="space-y-2">
                              <Label htmlFor={field.id}>
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </Label>
                              {renderField(field)}
                            </div>
                          ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            } else {
              return (
                <Card key={section.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    {section.description && (
                      <CardDescription>{section.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {sectionFields
                      .filter(field => logicEngine ? logicEngine.isFieldVisible(field.id) : true)
                      .map(field => (
                        <div key={field.id} className="space-y-2">
                          <Label htmlFor={field.id}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          {renderField(field)}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              );
            }
          })}

          {/* Render unsectioned fields */}
          {unsectioned.length > 0 && (
            <div className="space-y-4">
              {unsectioned
                .sort((a, b) => a.order_index - b.order_index)
                .filter(field => logicEngine ? logicEngine.isFieldVisible(field.id) : true)
                .map(field => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}
            </div>
          )}

          <Button className="w-full" disabled>
            Submit Form (Preview Mode)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};