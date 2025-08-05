import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type FieldType = Database['public']['Enums']['field_type'];

interface FormField {
  id: string;
  field_type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  conditional_logic?: any;
  order_index: number;
  section_id?: string;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  is_collapsible: boolean;
  is_collapsed: boolean;
  order_index: number;
}

interface FormData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  allow_anonymous: boolean;
  submission_limit?: number;
  due_date?: string;
  folder_id?: string;
}

interface UseFormDataReturn {
  form: FormData | null;
  fields: FormField[];
  sections: FormSection[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useFormData(formId?: string): UseFormDataReturn {
  const [form, setForm] = useState<FormData | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFormData = useCallback(async () => {
    if (!formId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch form data, fields, and sections in parallel
      const [formResponse, fieldsResponse, sectionsResponse] = await Promise.all([
        supabase.from('forms').select('*').eq('id', formId).single(),
        supabase.from('form_fields').select('*').eq('form_id', formId).order('order_index'),
        supabase.from('form_sections').select('*').eq('form_id', formId).order('order_index')
      ]);

      if (formResponse.error) throw formResponse.error;
      if (fieldsResponse.error) throw fieldsResponse.error;
      if (sectionsResponse.error) throw sectionsResponse.error;

      setForm(formResponse.data);
      // Transform fields to match interface
      const transformedFields: FormField[] = (fieldsResponse.data || []).map(field => ({
        id: field.id,
        field_type: field.field_type,
        label: field.label,
        placeholder: field.placeholder || undefined,
        required: field.required || false,
        options: field.options,
        order_index: field.order_index,
        section_id: field.section_id || undefined,
        conditional_logic: field.conditional_logic
      }));
      
      setFields(transformedFields);
      setSections(sectionsResponse.data || []);
    } catch (err: any) {
      console.error('Error fetching form data:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load form data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchFormData();
  }, [fetchFormData]);

  return {
    form,
    fields,
    sections,
    loading,
    error,
    refetch: fetchFormData
  };
}