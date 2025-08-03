import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Plus, Trash2, GripVertical, Calendar, Clock, X, Briefcase, Copy, FolderPlus, Eye, Edit3 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { FolderSelector } from './FolderSelector';
import { SectionContainer } from './SectionContainer';
import { DraggableField } from './DraggableField';
import { DraggableSection } from './DraggableSection';
import { FormPreview } from './FormPreview';
import { formatShortCodeForDisplay } from '@/utils/shortCode';
import type { Database } from '@/integrations/supabase/types';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

type FieldType = Database['public']['Enums']['field_type'];
type FormStatus = Database['public']['Enums']['form_status'];

interface FormField {
  id: string;
  field_type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  order_index: number;
  section_id?: string;
  conditional_logic?: any;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

interface FormBuilderProps {
  formId: string | null;
  onSave: () => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const BUSINESS_DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({ formId, onSave }) => {
  // Basic form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FormStatus>('draft');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Drag and drop states
  const [draggedItem, setDraggedItem] = useState<FormField | FormSection | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Preview and save states
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Scheduling states
  const [scheduleType, setScheduleType] = useState('one_time');
  const [scheduleFrequency, setScheduleFrequency] = useState('');
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [scheduleStartDate, setScheduleStartDate] = useState('');
  const [scheduleEndDate, setScheduleEndDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC');
  
  // Business days states
  const [businessDaysOnly, setBusinessDaysOnly] = useState(false);
  const [businessDays, setBusinessDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default to Mon-Fri
  
  // Additional drag state for compatibility
  
  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (formId && formId !== 'new' && user) {
      fetchForm();
    } else if (!formId || formId === 'new') {
      // Reset for new form and add Today's Date field
      setTitle('');
      setDescription('');
      setStatus('draft');
      setFolderId(null);
      setEditingSectionId(null);
      // Reset scheduling
      setScheduleType('one_time');
      setScheduleFrequency('');
      setScheduleDays([]);
      setScheduleStartDate('');
      setScheduleEndDate('');
      setScheduleTime('09:00');
      setScheduleTimezone('UTC');
      // Reset business days
      setBusinessDaysOnly(false);
      setBusinessDays([1, 2, 3, 4, 5]);
      
      // Create Form Defaults section
      const formDefaultsSection: FormSection = {
        id: 'form-defaults-section',
        title: 'Form Defaults',
        description: 'System-generated fields that cannot be modified',
        order_index: 0,
        is_collapsible: false,
        is_collapsed: false,
      };
      
      // Add Today's Date field to the Form Defaults section
      const todayDateField: FormField = {
        id: 'todays-date-field',
        field_type: 'date',
        label: "Today's Date",
        placeholder: '',
        required: true,
        order_index: 0,
        section_id: 'form-defaults-section',
      };
      
      setSections([formDefaultsSection]);
      setFields([todayDateField]);
    }
  }, [formId, user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create or edit forms",
        variant: "destructive",
      });
    }
  };

  const fetchForm = async () => {
    if (!formId || !user) return;

    try {
      const { data: formData, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (fieldsError) throw fieldsError;

      // Fetch form sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('form_sections')
        .select('*')
        .eq('form_id', formId)
        .order('order_index');

      if (sectionsError) throw sectionsError;

      setTitle(formData.title);
      setDescription(formData.description || '');
      setStatus(formData.status);
      setFolderId(formData.folder_id);
      setShortCode(formData.short_code);
      setAllowAnonymous(formData.allow_anonymous || false);
      
      // Transform the database fields to match our FormField interface
      const transformedFields: FormField[] = (fieldsData || []).map(field => ({
        id: field.id,
        field_type: field.field_type,
        label: field.label,
        placeholder: field.placeholder,
        required: field.required || false,
        options: field.options,
        order_index: field.order_index,
        section_id: field.section_id,
        conditional_logic: field.conditional_logic
      }));
      
      // Transform sections data first
      const transformedSections: FormSection[] = (sectionsData || []).map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order_index: section.order_index,
        is_collapsible: section.is_collapsible,
        is_collapsed: section.is_collapsed
      }));
      
      // Ensure Today's Date field exists and Form Defaults section exists
      const hasDateField = transformedFields.some(field => field.id === 'todays-date-field' || field.label === "Today's Date");
      const hasFormDefaultsSection = transformedSections.some(section => section.id === 'form-defaults-section');
      
      if (!hasFormDefaultsSection) {
        const formDefaultsSection: FormSection = {
          id: 'form-defaults-section',
          title: 'Form Defaults',
          description: 'System-generated fields that cannot be modified',
          order_index: 0,
          is_collapsible: false,
          is_collapsed: false,
        };
        transformedSections.unshift(formDefaultsSection);
        // Adjust order indexes for other sections
        transformedSections.forEach((section, index) => {
          if (section.id !== 'form-defaults-section') {
            section.order_index = index;
          }
        });
      }
      
      if (!hasDateField) {
        const todayDateField: FormField = {
          id: 'todays-date-field',
          field_type: 'date',
          label: "Today's Date",
          placeholder: '',
          required: true,
          order_index: 0,
          section_id: 'form-defaults-section',
        };
        transformedFields.unshift(todayDateField);
        // Adjust order indexes for other fields
        transformedFields.forEach((field, index) => {
          if (field.id !== 'todays-date-field') {
            field.order_index = index;
          }
        });
      }
      
      setFields(transformedFields);
      setSections(transformedSections);

      // Set scheduling data with proper type checking
      setScheduleType(formData.schedule_type || 'one_time');
      setScheduleFrequency(formData.schedule_frequency || '');
      
      // Safely handle schedule_days with type checking
      const daysFromDb = formData.schedule_days;
      if (Array.isArray(daysFromDb) && daysFromDb.every(day => typeof day === 'number')) {
        setScheduleDays(daysFromDb as number[]);
      } else {
        setScheduleDays([]);
      }
      
      setScheduleStartDate(formData.schedule_start_date ? formData.schedule_start_date.split('T')[0] : '');
      setScheduleEndDate(formData.schedule_end_date ? formData.schedule_end_date.split('T')[0] : '');
      setScheduleTime(formData.schedule_time || '09:00');
      setScheduleTimezone(formData.schedule_timezone || 'UTC');
      
      // Set business days data - now these properties exist in the database
      setBusinessDaysOnly(formData.business_days_only || false);
      const businessDaysFromDb = formData.business_days;
      if (Array.isArray(businessDaysFromDb) && businessDaysFromDb.every(day => typeof day === 'number')) {
        setBusinessDays(businessDaysFromDb as number[]);
      } else {
        setBusinessDays([1, 2, 3, 4, 5]);
      }
    } catch (error: any) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form",
        variant: "destructive",
      });
    }
  };

  const addField = (sectionId?: string) => {
    const newField: FormField = {
      id: Date.now().toString(),
      field_type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
      order_index: fields.length,
      section_id: sectionId,
    };
    setFields([...fields, newField]);
  };

  const addSection = () => {
    const newSection: FormSection = {
      id: Date.now().toString(),
      title: 'New Section',
      description: '',
      order_index: sections.length,
      is_collapsible: true,
      is_collapsed: false,
    };
    setSections([...sections, newSection]);
    setEditingSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, updates: Partial<FormSection>) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, ...updates } : section
    ));
  };

  const removeSection = (sectionId: string) => {
    // Prevent removal of Form Defaults section
    if (sectionId === 'form-defaults-section') {
      toast({
        title: "Cannot Remove Section",
        description: "Form Defaults section cannot be removed",
        variant: "destructive",
      });
      return;
    }
    
    // Move fields from this section to no section
    setFields(fields.map(field => 
      field.section_id === sectionId ? { ...field, section_id: undefined } : field
    ));
    setSections(sections.filter(section => section.id !== sectionId));
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    updateSection(sectionId, { 
      is_collapsed: !sections.find(s => s.id === sectionId)?.is_collapsed 
    });
  };

  const handleSectionEdit = (sectionId: string) => {
    // Prevent editing of Form Defaults section
    if (sectionId === 'form-defaults-section') {
      return;
    }
    setEditingSectionId(sectionId);
  };

  const handleSectionSave = (sectionId: string, title: string, description?: string) => {
    updateSection(sectionId, { title, description });
    setEditingSectionId(null);
  };

  const handleSectionCancel = () => {
    setEditingSectionId(null);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    const fieldToRemove = fields[index];
    // Prevent removal of Today's Date field
    if (fieldToRemove.id === 'todays-date-field' || fieldToRemove.label === "Today's Date") {
      toast({
        title: "Cannot Remove Field",
        description: "Today's Date field cannot be removed from forms",
        variant: "destructive",
      });
      return;
    }
    setFields(fields.filter((_, i) => i !== index));
  };

  const addOption = (fieldIndex: number) => {
    const updatedFields = [...fields];
    const field = updatedFields[fieldIndex];
    const options = field.options || { choices: [] };
    options.choices = [...options.choices, ''];
    updatedFields[fieldIndex] = { ...field, options };
    setFields(updatedFields);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const updatedFields = [...fields];
    const field = updatedFields[fieldIndex];
    const options = field.options || { choices: [] };
    options.choices[optionIndex] = value;
    updatedFields[fieldIndex] = { ...field, options };
    setFields(updatedFields);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const updatedFields = [...fields];
    const field = updatedFields[fieldIndex];
    const options = field.options || { choices: [] };
    options.choices = options.choices.filter((_: any, i: number) => i !== optionIndex);
    updatedFields[fieldIndex] = { ...field, options };
    setFields(updatedFields);
  };

  const handleDayToggle = (day: number) => {
    setScheduleDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleBusinessDayToggle = (day: number) => {
    setBusinessDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    if (active.data.current?.type === 'field') {
      setDraggedItem(active.data.current.field);
    } else if (active.data.current?.type === 'section') {
      setDraggedItem(active.data.current.section);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setDraggedItem(null);
      return;
    }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    
    if (activeType === 'field' && overType === 'field') {
      // Reordering fields
      const oldIndex = fields.findIndex(field => field.id === active.id);
      const newIndex = fields.findIndex(field => field.id === over.id);
      
      if (oldIndex !== newIndex) {
        const reorderedFields = arrayMove(fields, oldIndex, newIndex);
        // Update order_index for all fields
        const updatedFields = reorderedFields.map((field, index) => ({
          ...field,
          order_index: index
        }));
        setFields(updatedFields);
      }
    } else if (activeType === 'section' && overType === 'section') {
      // Reordering sections
      const oldIndex = sections.findIndex(section => section.id === active.id);
      const newIndex = sections.findIndex(section => section.id === over.id);
      
      if (oldIndex !== newIndex) {
        const reorderedSections = arrayMove(sections, oldIndex, newIndex);
        // Update order_index for all sections
        const updatedSections = reorderedSections.map((section, index) => ({
          ...section,
          order_index: index
        }));
        setSections(updatedSections);
      }
    }
    
    setActiveId(null);
    setDraggedItem(null);
  };

  const copyToClipboard = () => {
    if (!shortCode) {
      toast({
        title: "No short code available",
        description: "Please save the form first to generate a short code",
        variant: "destructive",
      });
      return;
    }
    
    const baseUrl = window.location.origin;
    const formUrl = `${baseUrl}/form/${shortCode}`;
    navigator.clipboard.writeText(formUrl);
    toast({
      title: "Success",
      description: "Form link copied to clipboard",
    });
  };

  const saveForm = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save forms",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Form title is required",
        variant: "destructive",
      });
      return;
    }

    // Validate business days configuration
    if (businessDaysOnly && businessDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one business day when using business days only option",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Start a transaction-like approach with rollback capability
      let savedFormId = formId;
      let originalSections: any[] = [];
      let originalFields: any[] = [];

      console.log('Starting form save process...');

      // If updating existing form, backup current data
      if (formId && formId !== 'new') {
        const { data: existingSections } = await supabase
          .from('form_sections')
          .select('*')
          .eq('form_id', formId);
        
        const { data: existingFields } = await supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', formId);

        originalSections = existingSections || [];
        originalFields = existingFields || [];
      }

      const formData = {
        title,
        description,
        status,
        folder_id: folderId,
        allow_anonymous: allowAnonymous,
        schedule_type: scheduleType,
        schedule_frequency: scheduleFrequency || null,
        schedule_days: scheduleType === 'weekly' ? scheduleDays : null,
        schedule_start_date: scheduleStartDate ? `${scheduleStartDate}T00:00:00.000Z` : null,
        schedule_end_date: scheduleEndDate ? `${scheduleEndDate}T00:00:00.000Z` : null,
        schedule_time: scheduleTime,
        schedule_timezone: scheduleTimezone,
        business_days_only: businessDaysOnly,
        business_days: businessDaysOnly ? businessDays : null,
        updated_at: new Date().toISOString(),
      };

      console.log('Saving form data...');

      if (formId && formId !== 'new') {
        // Update existing form
        const { error } = await supabase
          .from('forms')
          .update(formData)
          .eq('id', formId);

        if (error) throw error;
      } else {
        // Create new form with user_id
        const { data, error } = await supabase
          .from('forms')
          .insert({
            ...formData,
            user_id: user.id, // This is crucial for RLS
          })
          .select()
          .single();

        if (error) throw error;
        savedFormId = data.id;
      }

      console.log('Form saved successfully, now saving sections and fields...');

      try {
        // Delete existing sections and fields for updates
        if (formId && formId !== 'new') {
          await supabase
            .from('form_fields')
            .delete()
            .eq('form_id', formId);
          
          await supabase
            .from('form_sections')
            .delete()
            .eq('form_id', formId);
        }

        // Step 1: Insert new sections and capture UUID mapping
        const sectionIdMapping: { [tempId: string]: string } = {};
        
        if (sections.length > 0) {
          const sectionsToInsert = sections.map((section, index) => ({
            form_id: savedFormId,
            title: section.title,
            description: section.description,
            order_index: index,
            is_collapsible: section.is_collapsible,
            is_collapsed: section.is_collapsed,
          }));

          console.log('Inserting sections...', sectionsToInsert);

          const { data: insertedSections, error: sectionsError } = await supabase
            .from('form_sections')
            .insert(sectionsToInsert)
            .select('id, order_index');

          if (sectionsError) throw sectionsError;

          // Create mapping from temporary IDs to real database UUIDs
          if (insertedSections) {
            insertedSections.forEach((insertedSection, index) => {
              const originalSection = sections[index];
              sectionIdMapping[originalSection.id] = insertedSection.id;
            });
          }

          console.log('Section ID mapping:', sectionIdMapping);
        }

        // Step 2: Insert new fields with corrected section IDs
        if (fields.length > 0) {
          const fieldsToInsert = fields.map((field, index) => {
            
            // Update section_id to use real database UUID if it was a temporary ID
            let correctedSectionId = field.section_id;
            if (field.section_id && sectionIdMapping[field.section_id]) {
              correctedSectionId = sectionIdMapping[field.section_id];
              console.log(`Updated field "${field.label}" section_id from ${field.section_id} to ${correctedSectionId}`);
            }
            
            return {
              form_id: savedFormId,
              field_type: field.field_type,
              label: field.label,
              placeholder: field.placeholder,
              required: field.required,
              options: field.options,
              conditional_logic: field.conditional_logic,
              order_index: index,
              section_id: correctedSectionId || null // Handle undefined case
            };
          });

          console.log('Inserting fields with corrected section IDs...', fieldsToInsert);

          const { error: fieldsError } = await supabase
            .from('form_fields')
            .insert(fieldsToInsert);

          if (fieldsError) throw fieldsError;
        }

        console.log('Form save completed successfully');

        toast({
          title: "Success",
          description: formId ? "Form updated successfully" : "Form created successfully",
        });

        onSave();
      } catch (sectionFieldError) {
        console.error('Error saving sections/fields, attempting rollback...', sectionFieldError);
        
        // Attempt to rollback by restoring original data
        if (formId && formId !== 'new' && (originalSections.length > 0 || originalFields.length > 0)) {
          try {
            if (originalSections.length > 0) {
              await supabase
                .from('form_sections')
                .insert(originalSections.map(({ id, ...section }) => section));
            }
            
            if (originalFields.length > 0) {
              await supabase
                .from('form_fields')
                .insert(originalFields.map(({ id, ...field }) => field));
            }
            
            console.log('Rollback completed');
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
          }
        }
        
        throw sectionFieldError;
      }
    } catch (error: any) {
      console.error('Error saving form:', error);
      
      let errorMessage = "Failed to save form";
      
      if (error.message?.includes('conditional_logic')) {
        errorMessage = "Invalid conditional logic configuration. Please check your rules and try again.";
      } else if (error.message?.includes('foreign key')) {
        errorMessage = "There's an issue with form relationships. Please refresh and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-6">
                Please log in to create or edit forms
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderFieldEditor = (field: FormField, globalIndex: number) => {
    const isTodaysDateField = field.id === 'todays-date-field' || field.label === "Today's Date";
    
    return (
      <Card key={field.id} className={`p-4 ${isTodaysDateField ? 'bg-blue-50 border-blue-200' : ''}`}>
        {isTodaysDateField && (
          <div className="mb-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Required System Field
            </Badge>
            <p className="text-xs text-blue-600 mt-1">
              This field is automatically added to all forms and cannot be removed or modified.
            </p>
          </div>
        )}
        <div className="flex items-start space-x-4">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
          <div className="flex-1 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Field Type</Label>
                <Select
                  value={field.field_type}
                  onValueChange={(value: FieldType) => updateField(globalIndex, { field_type: value })}
                  disabled={isTodaysDateField}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="email">Email</SelectItem>  
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="select">Dropdown</SelectItem>
                    <SelectItem value="radio">Multiple Choice (Single)</SelectItem>
                    <SelectItem value="checkbox">Multiple Choice (Multiple)</SelectItem>
                    <SelectItem value="signature">Signature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => updateField(globalIndex, { label: e.target.value })}
                  placeholder="Field label"
                  disabled={isTodaysDateField}
                />
              </div>
            </div>
            
            {(field.field_type === 'text' || field.field_type === 'email' || field.field_type === 'number') && (
              <div>
                <Label>Placeholder</Label>
                <Input
                  value={field.placeholder || ''}
                  onChange={(e) => updateField(globalIndex, { placeholder: e.target.value })}
                  placeholder="Field placeholder"
                />
              </div>
            )}

            {field.field_type === 'signature' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Signature Field:</strong> Users will be able to either draw their signature or type their name. 
                  The signature data will be stored securely and can be viewed in form responses.
                </p>
              </div>
            )}

            {(field.field_type === 'select' || field.field_type === 'radio' || field.field_type === 'checkbox') && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(globalIndex)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {(field.options?.choices || []).map((option: string, optionIndex: number) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(globalIndex, optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(globalIndex, optionIndex)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {field.field_type === 'checkbox' && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={field.options?.allowMultiple !== false}
                        onCheckedChange={(checked) => 
                          updateField(globalIndex, { 
                            options: { ...field.options, allowMultiple: checked }
                          })
                        }
                      />
                      <Label className="text-sm">Allow multiple selections</Label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => updateField(globalIndex, { required: checked })}
                disabled={isTodaysDateField}
              />
              <Label>Required field</Label>
            </div>

          </div>
          {!isTodaysDateField && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeField(globalIndex)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Form Builder</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={() => setShowPreview(!showPreview)} 
            variant="outline"
          >
            {showPreview ? <Edit3 className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? 'Edit Form' : 'Preview Form'}
          </Button>
          <Button onClick={copyToClipboard} variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button onClick={saveForm} disabled={!title || isSaving}>
            {isSaving ? 'Saving...' : (formId ? 'Update Form' : 'Save Form')}
          </Button>
        </div>
      </div>

      {showPreview ? (
        <FormPreview
          title={title}
          description={description}
          fields={fields}
          sections={sections}
        />
      ) : (
        <div className="grid gap-6">
          {/* Basic Form Settings */}
          <Card>
          <CardHeader>
            <CardTitle>Form Settings</CardTitle>
            <CardDescription>Configure your form's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Form Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter form title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter form description"
              />
            </div>
            <div>
              <FolderSelector
                value={folderId}
                onValueChange={setFolderId}
              />
            </div>
            {shortCode && (
              <div>
                <Label>Quick Access Code</Label>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                  <code className="text-sm font-mono bg-background px-2 py-1 rounded border flex-1">
                    {formatShortCodeForDisplay(shortCode)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(shortCode);
                      toast({ title: "Short code copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Users can access this form using this short code instead of the full URL
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: FormStatus) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={allowAnonymous}
                onCheckedChange={setAllowAnonymous}
              />
              <div>
                <Label>Allow anonymous submissions</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, users can fill out this form without logging in. Only works when form is published.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <div>
                <CardTitle>Schedule Settings</CardTitle>
                <CardDescription>Configure when your form should be available or sent</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="scheduleType">Schedule Type</Label>
              <Select value={scheduleType} onValueChange={setScheduleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {scheduleType === 'custom' && (
              <div>
                <Label htmlFor="scheduleFrequency">Frequency</Label>
                <Input
                  id="scheduleFrequency"
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value)}
                  placeholder="e.g., every_3_days, every_2_weeks"
                />
              </div>
            )}

            {scheduleType === 'weekly' && (
              <div>
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Switch
                        checked={scheduleDays.includes(day.value)}
                        onCheckedChange={() => handleDayToggle(day.value)}
                      />
                      <Label className="text-sm">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduleStartDate">Start Date</Label>
                <DatePicker
                  date={scheduleStartDate ? new Date(`${scheduleStartDate}T12:00:00`) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const day = date.getDate().toString().padStart(2, '0');
                      setScheduleStartDate(`${year}-${month}-${day}`);
                    } else {
                      setScheduleStartDate('');
                    }
                  }}
                  placeholder="Select start date"
                />
              </div>
              <div>
                <Label htmlFor="scheduleEndDate">End Date (Optional)</Label>
                <DatePicker
                  date={scheduleEndDate ? new Date(`${scheduleEndDate}T12:00:00`) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const day = date.getDate().toString().padStart(2, '0');
                      setScheduleEndDate(`${year}-${month}-${day}`);
                    } else {
                      setScheduleEndDate('');
                    }
                  }}
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduleTime">Time</Label>
                <TimePicker
                  time={scheduleTime}
                  onSelect={(time) => setScheduleTime(time)}
                  placeholder="Select schedule time"
                />
              </div>
              <div>
                <Label htmlFor="scheduleTimezone">Timezone</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="scheduleTimezone"
                    value="UTC"
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Days Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5" />
              <div>
                <CardTitle>Business Days Settings</CardTitle>
                <CardDescription>Configure business days scheduling for better overdue tracking</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={businessDaysOnly}
                onCheckedChange={setBusinessDaysOnly}
              />
              <Label>Consider business days only</Label>
            </div>

            {businessDaysOnly && (
              <>
                <div>
                  <Label>Business Days</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Select which days are considered business days for this form
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {BUSINESS_DAYS.map((day) => (
                      <div key={day.value} className="flex items-center space-x-2">
                        <Switch
                          checked={businessDays.includes(day.value)}
                          onCheckedChange={() => handleBusinessDayToggle(day.value)}
                        />
                        <Label className="text-sm">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Form Structure */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Form Structure</CardTitle>
                <CardDescription>Organize your form with sections and fields (drag to reorder)</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button onClick={addSection} variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
                <Button onClick={() => addField()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Fields without sections */}
              {fields.filter(field => !field.section_id).length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Unsectioned Fields</h4>
                  <SortableContext
                    items={fields.filter(field => !field.section_id).map(field => field.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {fields
                      .filter(field => !field.section_id)
                      .map((field) => {
                        const globalIndex = fields.indexOf(field);
                        return (
                          <DraggableField
                            key={field.id}
                            field={field}
                            index={globalIndex}
                            onUpdate={updateField}
                            onRemove={removeField}
                            onAddOption={addOption}
                            onUpdateOption={updateOption}
                            onRemoveOption={removeOption}
                            availableFields={fields}
                            availableSections={sections}
                          />
                        );
                      })}
                  </SortableContext>
                </div>
              )}

              {/* Sections with their fields */}
              {sections.length > 0 && (
                <div className="space-y-4">
                  <SortableContext
                    items={sections.map(section => section.id)}
                    strategy={verticalListSortingStrategy}
                  >
                     {sections.map((section) => {
                       const isFormDefaultsSection = section.id === 'form-defaults-section';
                       return (
                       <DraggableSection
                         key={section.id}
                         section={section}
                         isEditing={editingSectionId === section.id}
                         onToggleCollapse={() => toggleSectionCollapse(section.id)}
                         onEdit={() => handleSectionEdit(section.id)}
                         onSave={(title, description) => handleSectionSave(section.id, title, description)}
                         onCancel={handleSectionCancel}
                         onDelete={() => removeSection(section.id)}
                         isReadOnly={isFormDefaultsSection}
                       >
                        <div className="space-y-4">
                          <SortableContext
                            items={fields.filter(field => field.section_id === section.id).map(field => field.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {fields
                              .filter(field => field.section_id === section.id)
                              .map((field) => {
                                const globalIndex = fields.indexOf(field);
                                return (
                                  <DraggableField
                                    key={field.id}
                                    field={field}
                                    index={globalIndex}
                                    onUpdate={updateField}
                                    onRemove={removeField}
                                    onAddOption={addOption}
                                    onUpdateOption={updateOption}
                                    onRemoveOption={removeOption}
                                    availableFields={fields}
                                    availableSections={sections}
                                  />
                                );
                              })}
                          </SortableContext>
                           
                           {!isFormDefaultsSection && (
                             <Button
                               variant="outline"
                               className="w-full"
                               onClick={() => addField(section.id)}
                             >
                               <Plus className="h-4 w-4 mr-2" />
                               Add Field to Section
                             </Button>
                           )}
                        </div>
                       </DraggableSection>
                       );
                     })}
                  </SortableContext>
                </div>
              )}

              <DragOverlay>
                {activeId && draggedItem && (
                  <div className="opacity-50">
                    {'field_type' in draggedItem ? (
                      <Card className="p-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4" />
                          <span>{draggedItem.label}</span>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4" />
                          <span>{draggedItem.title}</span>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </DragOverlay>

              {sections.length === 0 && fields.filter(field => !field.section_id).length <= 1 && (
                <div className="text-center py-8 text-muted-foreground">
                  No additional fields or sections added yet. Click "Add Section" or "Add Field" to get started.
                </div>
              )}
            </DndContext>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
