
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { Plus, Trash2, GripVertical, Calendar, Clock, X, Briefcase, Copy, FolderPlus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { FolderSelector } from './FolderSelector';
import { SectionContainer } from './SectionContainer';
import { formatShortCodeForDisplay } from '@/utils/shortCode';
import type { Database } from '@/integrations/supabase/types';

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
];

export const FormBuilder: React.FC<FormBuilderProps> = ({ formId, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FormStatus>('draft');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

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
  const [excludeHolidays, setExcludeHolidays] = useState(false);
  const [holidayCalendar, setHolidayCalendar] = useState('US');

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (formId && formId !== 'new' && user) {
      fetchForm();
    } else if (!formId || formId === 'new') {
      // Reset for new form
      setTitle('');
      setDescription('');
      setStatus('draft');
      setFolderId(null);
      setFields([]);
      setSections([]);
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
      setExcludeHolidays(false);
      setHolidayCalendar('US');
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
      
      // Transform the database fields to match our FormField interface
      const transformedFields: FormField[] = (fieldsData || []).map(field => ({
        id: field.id,
        field_type: field.field_type,
        label: field.label,
        placeholder: field.placeholder,
        required: field.required || false,
        options: field.options,
        order_index: field.order_index,
        section_id: field.section_id
      }));
      
      setFields(transformedFields);

      // Transform sections data
      const transformedSections: FormSection[] = (sectionsData || []).map(section => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order_index: section.order_index,
        is_collapsible: section.is_collapsible,
        is_collapsed: section.is_collapsed
      }));
      
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
      
      setScheduleStartDate(formData.schedule_start_date ? new Date(formData.schedule_start_date).toISOString().split('T')[0] : '');
      setScheduleEndDate(formData.schedule_end_date ? new Date(formData.schedule_end_date).toISOString().split('T')[0] : '');
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
      setExcludeHolidays(formData.exclude_holidays || false);
      setHolidayCalendar(formData.holiday_calendar || 'US');
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

    setLoading(true);
    try {
      let savedFormId = formId;

      const formData = {
        title,
        description,
        status,
        folder_id: folderId,
        schedule_type: scheduleType,
        schedule_frequency: scheduleFrequency || null,
        schedule_days: scheduleType === 'weekly' ? scheduleDays : null,
        schedule_start_date: scheduleStartDate ? new Date(scheduleStartDate).toISOString() : null,
        schedule_end_date: scheduleEndDate ? new Date(scheduleEndDate).toISOString() : null,
        schedule_time: scheduleTime,
        schedule_timezone: scheduleTimezone,
        business_days_only: businessDaysOnly,
        business_days: businessDaysOnly ? businessDays : null,
        exclude_holidays: excludeHolidays,
        holiday_calendar: excludeHolidays ? holidayCalendar : null,
        updated_at: new Date().toISOString(),
      };

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

      // Delete existing sections and fields, then recreate them
      if (formId && formId !== 'new') {
        await supabase
          .from('form_sections')
          .delete()
          .eq('form_id', formId);
        
        await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId);
      }

      // Insert new sections
      if (sections.length > 0) {
        const sectionsToInsert = sections.map((section, index) => ({
          form_id: savedFormId,
          title: section.title,
          description: section.description,
          order_index: index,
          is_collapsible: section.is_collapsible,
          is_collapsed: section.is_collapsed,
        }));

        const { error: sectionsError } = await supabase
          .from('form_sections')
          .insert(sectionsToInsert);

        if (sectionsError) throw sectionsError;
      }

      // Insert new fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((field, index) => ({
          form_id: savedFormId,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          order_index: index,
          section_id: field.section_id,
        }));

        const { error: fieldsError } = await supabase
          .from('form_fields')
          .insert(fieldsToInsert);

        if (fieldsError) throw fieldsError;
      }

      toast({
        title: "Success",
        description: formId ? "Form updated successfully" : "Form created successfully",
      });

      onSave();
    } catch (error: any) {
      console.error('Error saving form:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {formId ? 'Edit Form' : 'Create New Form'}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onSave}>
            Cancel
          </Button>
          <Button onClick={saveForm} disabled={loading}>
            {loading ? 'Saving...' : 'Save Form'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Form Settings */}
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
                  date={scheduleStartDate ? new Date(scheduleStartDate) : undefined}
                  onSelect={(date) => setScheduleStartDate(date ? date.toISOString().split('T')[0] : '')}
                  placeholder="Select start date"
                />
              </div>
              <div>
                <Label htmlFor="scheduleEndDate">End Date (Optional)</Label>
                <DatePicker
                  date={scheduleEndDate ? new Date(scheduleEndDate) : undefined}
                  onSelect={(date) => setScheduleEndDate(date ? date.toISOString().split('T')[0] : '')}
                  placeholder="Select end date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduleTime">Time</Label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <Input
                    id="scheduleTime"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
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

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={excludeHolidays}
                    onCheckedChange={setExcludeHolidays}
                  />
                  <Label>Exclude holidays</Label>
                </div>

                {excludeHolidays && (
                  <div>
                    <Label htmlFor="holidayCalendar">Holiday Calendar</Label>
                    <Select value={holidayCalendar} onValueChange={setHolidayCalendar}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="EU">European Union</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      Holiday exclusion will be implemented in a future update
                    </p>
                  </div>
                )}
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
                <CardDescription>Organize your form with sections and fields</CardDescription>
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
            {/* Fields without sections */}
            {fields.filter(field => !field.section_id).length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Unsectioned Fields</h4>
                {fields
                  .filter(field => !field.section_id)
                  .map((field, index) => {
                    const globalIndex = fields.indexOf(field);
                    return (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-start space-x-4">
                          <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Field Type</Label>
                                <Select
                                  value={field.field_type}
                                  onValueChange={(value: FieldType) => updateField(globalIndex, { field_type: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="select">Dropdown</SelectItem>
                                    <SelectItem value="radio">Multiple Choice (Single)</SelectItem>
                                    <SelectItem value="checkbox">Multiple Choice (Multiple)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label>Label</Label>
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(globalIndex, { label: e.target.value })}
                                  placeholder="Field label"
                                />
                              </div>
                            </div>
                            
                            {field.field_type === 'text' && (
                              <div>
                                <Label>Placeholder</Label>
                                <Input
                                  value={field.placeholder || ''}
                                  onChange={(e) => updateField(globalIndex, { placeholder: e.target.value })}
                                  placeholder="Field placeholder"
                                />
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
                              />
                              <Label>Required field</Label>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeField(globalIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            )}

            {/* Sections with their fields */}
            {sections.map((section) => (
              <SectionContainer
                key={section.id}
                id={section.id}
                title={section.title}
                description={section.description}
                isCollapsible={section.is_collapsible}
                isCollapsed={section.is_collapsed}
                isEditing={editingSectionId === section.id}
                onToggleCollapse={() => toggleSectionCollapse(section.id)}
                onEdit={() => handleSectionEdit(section.id)}
                onSave={(title, description) => handleSectionSave(section.id, title, description)}
                onCancel={handleSectionCancel}
                onDelete={() => removeSection(section.id)}
              >
                <div className="space-y-4">
                  {fields
                    .filter(field => field.section_id === section.id)
                    .map((field) => {
                      const globalIndex = fields.indexOf(field);
                      return (
                        <Card key={field.id} className="p-4 bg-muted/20">
                          <div className="flex items-start space-x-4">
                            <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Field Type</Label>
                                  <Select
                                    value={field.field_type}
                                    onValueChange={(value: FieldType) => updateField(globalIndex, { field_type: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text</SelectItem>
                                      <SelectItem value="date">Date</SelectItem>
                                      <SelectItem value="select">Dropdown</SelectItem>
                                      <SelectItem value="radio">Multiple Choice (Single)</SelectItem>
                                      <SelectItem value="checkbox">Multiple Choice (Multiple)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Label</Label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) => updateField(globalIndex, { label: e.target.value })}
                                    placeholder="Field label"
                                  />
                                </div>
                              </div>
                              
                              {field.field_type === 'text' && (
                                <div>
                                  <Label>Placeholder</Label>
                                  <Input
                                    value={field.placeholder || ''}
                                    onChange={(e) => updateField(globalIndex, { placeholder: e.target.value })}
                                    placeholder="Field placeholder"
                                  />
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
                                />
                                <Label>Required field</Label>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeField(globalIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => addField(section.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field to Section
                  </Button>
                </div>
              </SectionContainer>
            ))}

            {sections.length === 0 && fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No fields or sections added yet. Click "Add Section" or "Add Field" to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
