
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, Trash2, Copy, ExternalLink, QrCode } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { QrCodeDownloader } from '@/components/ui/qr-code-downloader';
import type { Database } from '@/integrations/supabase/types';

type FormStatus = Database['public']['Enums']['form_status'];

interface Form {
  id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  created_at: string;
  updated_at: string;
}

interface FormListProps {
  onEditForm: (formId: string) => void;
  onCreateForm: () => void;
  refreshTrigger?: number;
}

export const FormList: React.FC<FormListProps> = ({ onEditForm, onCreateForm, refreshTrigger }) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, [refreshTrigger]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('id, title, description, status, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error: any) {
      console.error('Error fetching forms:', error);
      toast({
        title: "Error",
        description: "Failed to fetch forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      setForms(forms.filter(form => form.id !== formId));
      toast({
        title: "Success",
        description: "Form deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
    }
  };

  const duplicateForm = async (form: Form) => {
    try {
      // Create new form
      const { data: newForm, error: formError } = await supabase
        .from('forms')
        .insert({
          title: `${form.title} (Copy)`,
          description: form.description,
          status: 'draft' as FormStatus,
        })
        .select()
        .single();

      if (formError) throw formError;

      // Copy form fields
      const { data: fields, error: fieldsError } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', form.id);

      if (fieldsError) throw fieldsError;

      if (fields && fields.length > 0) {
        const newFields = fields.map(field => ({
          form_id: newForm.id,
          field_type: field.field_type,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
          options: field.options,
          validation_rules: field.validation_rules,
          conditional_logic: field.conditional_logic,
          order_index: field.order_index,
        }));

        const { error: insertError } = await supabase
          .from('form_fields')
          .insert(newFields);

        if (insertError) throw insertError;
      }

      await fetchForms();
      toast({
        title: "Success",
        description: "Form duplicated successfully",
      });
    } catch (error: any) {
      console.error('Error duplicating form:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate form",
        variant: "destructive",
      });
    }
  };

  const copyFormLink = (formId: string) => {
    const url = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Success",
      description: "Form link copied to clipboard",
    });
  };

  const openFormInNewTab = (formId: string) => {
    const url = `${window.location.origin}/form/${formId}`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: FormStatus) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Forms</h2>
          <p className="text-gray-600 mt-1">Create and manage your forms</p>
        </div>
        <Button onClick={onCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No forms yet</h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first form
              </p>
              <Button onClick={onCreateForm}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{form.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {form.description || 'No description'}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(form.status)}>
                    {form.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Updated {new Date(form.updated_at).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditForm(form.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {form.status === 'published' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openFormInNewTab(form.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyFormLink(form.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <QrCodeDownloader
                          formId={form.id}
                          formTitle={form.title}
                        />
                      </>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => duplicateForm(form)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Form</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{form.title}"? This action cannot be undone and will also delete all responses.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteForm(form.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
