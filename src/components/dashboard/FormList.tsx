
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, Trash2, Copy, ExternalLink, QrCode, Folder } from 'lucide-react';
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
import { FolderManager } from './FolderManager';
import type { Database } from '@/integrations/supabase/types';

type FormStatus = Database['public']['Enums']['form_status'];

interface Form {
  id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface FormListProps {
  onEditForm: (formId: string) => void;
  onCreateForm: () => void;
  refreshTrigger?: number;
}

export const FormList: React.FC<FormListProps> = ({ onEditForm, onCreateForm, refreshTrigger }) => {
  const [forms, setForms] = useState<Form[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      // Fetch forms
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('id, title, description, status, created_at, updated_at, folder_id')
        .order('updated_at', { ascending: false });

      if (formsError) throw formsError;

      // Fetch folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('id, name, color')
        .order('name');

      if (foldersError) throw foldersError;

      setForms(formsData || []);
      setFolders(foldersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch forms and folders",
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
          folder_id: form.folder_id,
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

      await fetchData();
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
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'archived':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const renderFormCard = (form: Form, folderName?: string, folderColor?: string) => (
    <Card key={form.id} className="relative glass-effect card-hover h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg text-foreground truncate">{form.title}</CardTitle>
              <Badge className={getStatusColor(form.status)} variant="outline">
                {form.status}
              </Badge>
            </div>
            {folderName && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground mb-2 w-fit">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: folderColor }}
                />
                <span className="truncate">{folderName}</span>
              </div>
            )}
            <CardDescription className="text-sm text-muted-foreground line-clamp-2">
              {form.description || 'No description'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 flex flex-col justify-between">
        <div className="text-sm text-muted-foreground mb-4">
          Updated {new Date(form.updated_at).toLocaleDateString()}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditForm(form.id)}
            className="flex-1 min-w-0"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
          
          {form.status === 'published' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openFormInNewTab(form.id)}
                className="flex-1 min-w-0"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyFormLink(form.id)}
                className="flex-1 min-w-0"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Link
              </Button>
              <div className="flex-1 min-w-0">
                <QrCodeDownloader
                  formId={form.id}
                  formTitle={form.title}
                />
              </div>
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => duplicateForm(form)}
            className="flex-1 min-w-0"
          >
            <Copy className="h-4 w-4 mr-1" />
            Duplicate
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1 min-w-0 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
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
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading forms...</p>
        </div>
      </div>
    );
  }

  // Create a folder map for easy lookup
  const folderMap = folders.reduce((acc, folder) => {
    acc[folder.id] = folder;
    return acc;
  }, {} as Record<string, Folder>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Forms</h2>
          <p className="text-muted-foreground mt-1">Create and manage your forms</p>
        </div>
        <Button onClick={onCreateForm} className="brand-gradient hover:shadow-lg transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Folder Manager */}
      <FolderManager onRefresh={fetchData} />

      {forms.length === 0 ? (
        <Card className="glass-effect">
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2 text-foreground">No forms yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first form
              </p>
              <Button onClick={onCreateForm} className="brand-gradient hover:shadow-lg transition-all duration-200">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Form
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const folder = form.folder_id ? folderMap[form.folder_id] : null;
            return renderFormCard(form, folder?.name, folder?.color);
          })}
        </div>
      )}
    </div>
  );
};
