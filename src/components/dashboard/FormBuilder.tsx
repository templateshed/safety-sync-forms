import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, Calendar, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
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

export const FormBuilder: React.FC<FormBuilderProps> = ({ formId, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FormStatus>('draft');
  const [fields, setFields] = useState<FormField[]>([]);
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

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (formId && user) {
      fetchForm();
    } else if (!formId) {
      // Reset for new form
      setTitle('');
      setDescription('');
      setStatus('draft');
      setFields([]);
      // Reset scheduling
      setScheduleType('one_time');
      setScheduleFrequency('');
      setScheduleDays([]);
      setScheduleStartDate('');
      setScheduleEndDate('');
      setScheduleTime('09:00');
      setScheduleTimezone('UTC');
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

      setTitle(formData.title);
      setDescription(formData.description || '');
      setStatus(formData.status);
      setFields(fieldsData || []);

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
    } catch (error: any) {
      console.error('Error fetching form:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form",
        variant: "destructive",
      });
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      field_type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
      order_index: fields.length,
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleDayToggle = (day: number) => {
    setScheduleDays(prev => 
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

    setLoading(true);
    try {
      let savedFormId = formId;

      const formData = {
        title,
        description,
        status,
        schedule_type: scheduleType,
        schedule_frequency: scheduleFrequency || null,
        schedule_days: scheduleType === 'weekly' ? scheduleDays : null,
        schedule_start_date: scheduleStartDate ? new Date(scheduleStartDate).toISOString() : null,
        schedule_end_date: scheduleEndDate ? new Date(scheduleEndDate).toISOString() : null,
        schedule_time: scheduleTime,
        schedule_timezone: scheduleTimezone,
        updated_at: new Date().toISOString(),
      };

      if (formId) {
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

      // Delete existing fields and recreate them
      if (formId) {
        await supabase
          .from('form_fields')
          .delete()
          .eq('form_id', formId);
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
                <Input
                  id="scheduleStartDate"
                  type="date"
                  value={scheduleStartDate}
                  onChange={(e) => setScheduleStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="scheduleEndDate">End Date (Optional)</Label>
                <Input
                  id="scheduleEndDate"
                  type="date"
                  value={scheduleEndDate}
                  onChange={(e) => setScheduleEndDate(e.target.value)}
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
                <Select value={scheduleTimezone} onValueChange={setScheduleTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Fields */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Form Fields</CardTitle>
                <CardDescription>Add and configure form fields</CardDescription>
              </div>
              <Button onClick={addField}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No fields added yet. Click "Add Field" to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-start space-x-4">
                      <GripVertical className="h-5 w-5 text-gray-400 mt-2" />
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Field Type</Label>
                            <Select
                              value={field.field_type}
                              onValueChange={(value: FieldType) => updateField(index, { field_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="select">Select</SelectItem>
                                <SelectItem value="radio">Radio</SelectItem>
                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => updateField(index, { label: e.target.value })}
                              placeholder="Field label"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(index, { placeholder: e.target.value })}
                            placeholder="Field placeholder"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(index, { required: checked })}
                          />
                          <Label>Required field</Label>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
