
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, Trash2, Copy, ExternalLink, QrCode, Folder, FolderOpen } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

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

  const toggleFolder = (folderId: string) => {
    const newOpenFolders = new Set(openFolders);
    if (newOpenFolders.has(folderId)) {
      newOpenFolders.delete(folderId);
    } else {
      newOpenFolders.add(folderId);
    }
    setOpenFolders(newOpenFolders);
  };

  const renderFormCard = (form: Form) => (
    <Card key={form.id} className="relative glass-effect card-hover">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-foreground">{form.title}</CardTitle>
            <CardDescription className="mt-1 text-muted-foreground">
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
          <div className="text-sm text-muted-foreground">
            Updated {new Date(form.updated_at).toLocaleDateString()}
          </div>
          <div className="flex space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditForm(form.id)}
              className="hover:bg-muted/80"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            {form.status === 'published' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openFormInNewTab(form.id)}
                  className="hover:bg-muted/80"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyFormLink(form.id)}
                  className="hover:bg-muted/80"
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
              className="hover:bg-muted/80"
            >
              <Copy className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-muted/80">
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
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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

  // Group forms by folder
  const formsWithoutFolder = forms.filter(form => !form.folder_id);
  const formsByFolder = folders.reduce((acc, folder) => {
    acc[folder.id] = forms.filter(form => form.folder_id === folder.id);
    return acc;
  }, {} as Record<string, Form[]>);

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
        <div className="space-y-6">
          {/* Forms without folder */}
          {formsWithoutFolder.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-foreground">
                <Folder className="h-5 w-5 mr-2 text-muted-foreground" />
                No Folder ({formsWithoutFolder.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {formsWithoutFolder.map(renderFormCard)}
              </div>
            </div>
          )}

          {/* Folders with forms */}
          {folders.map((folder) => {
            const folderForms = formsByFolder[folder.id] || [];
            if (folderForms.length === 0) return null;

            const isOpen = openFolders.has(folder.id);

            return (
              <Collapsible key={folder.id} open={isOpen} onOpenChange={() => toggleFolder(folder.id)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                    {isOpen ? (
                      <FolderOpen className="h-5 w-5 mr-2" style={{ color: folder.color }} />
                    ) : (
                      <Folder className="h-5 w-5 mr-2" style={{ color: folder.color }} />
                    )}
                    <h3 className="text-lg font-semibold text-foreground">
                      {folder.name} ({folderForms.length})
                    </h3>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
                    {folderForms.map(renderFormCard)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};
