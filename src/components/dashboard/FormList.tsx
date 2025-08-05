import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Eye, Trash2, Copy, ExternalLink, QrCode, Folder, Link2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { FormExporter } from '@/components/ui/form-exporter';
import { FolderManager } from './FolderManager';
import { formatShortCodeForDisplay } from '@/utils/shortCode';
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
  short_code: string | null;
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

export const FormList = React.memo<FormListProps>(({ onEditForm, onCreateForm, refreshTrigger }) => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    try {
      // Fetch forms
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('id, title, description, status, created_at, updated_at, folder_id, short_code')
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


  const copyFormLink = (form: Form) => {
    // Use short code if available, otherwise fall back to UUID
    const identifier = form.short_code || form.id;
    const url = `https://forms.ascendrix.co.uk/form/${identifier}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Success",
      description: "Form link copied to clipboard",
    });
  };

  const copyShortCode = (shortCode: string) => {
    navigator.clipboard.writeText(shortCode);
    toast({
      title: "Success",
      description: `Short code "${formatShortCodeForDisplay(shortCode)}" copied to clipboard`,
    });
  };

  const openFormInNewTab = (formId: string) => {
    const url = `https://forms.ascendrix.co.uk/form/${formId}`;
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
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFormCard = (form: Form) => (
    <Card key={form.id} className="relative glass-effect card-hover">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg text-foreground">{form.title}</CardTitle>
              <Badge className={getStatusColor(form.status)} variant="outline">
                {form.status}
              </Badge>
            </div>
            <CardDescription className="text-sm text-muted-foreground">
              {form.description || 'No description'}
            </CardDescription>
            
            {/* Short Code Display */}
            {form.short_code && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-muted/30 rounded-md">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Quick Access Code</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
                      {formatShortCodeForDisplay(form.short_code)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyShortCode(form.short_code!);
                      }}
                      className="h-auto p-1 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground mt-2">
              Updated {new Date(form.updated_at).toLocaleDateString()}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Primary action - Edit button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditForm(form.id)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Form
            </Button>
            
            {/* Secondary actions */}
            {form.status === 'published' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyFormLink(form)}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            
            {form.status === 'published' && (
              <QrCodeDownloader
                formId={form.short_code || form.id}
                formTitle={form.title}
                shortCode={form.short_code}
                variant="outline"
                size="sm"
                showIcon={true}
                showText={true}
              />
             )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
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
        </div>
      </CardHeader>
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
        <div className="space-y-4">
          {/* Group forms by folder */}
          {folders.map((folder) => {
            const folderForms = forms.filter(form => form.folder_id === folder.id);
            if (folderForms.length === 0) return null;
            
            const isExpanded = expandedFolders.has(folder.id);
            
            return (
              <Collapsible key={folder.id} open={isExpanded} onOpenChange={() => toggleFolder(folder.id)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: folder.color }}
                      />
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{folder.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {folderForms.length} form{folderForms.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3 pl-6">
                  {folderForms.map((form) => renderFormCard(form))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          
          {/* Forms without folder (unfiled) */}
          {(() => {
            const unfiledForms = forms.filter(form => !form.folder_id);
            if (unfiledForms.length === 0) return null;
            
            const isExpanded = expandedFolders.has('unfiled');
            
            return (
              <Collapsible key="unfiled" open={isExpanded} onOpenChange={() => toggleFolder('unfiled')}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between p-4 h-auto hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0 bg-muted-foreground" />
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">Unfiled</span>
                      <Badge variant="secondary" className="ml-2">
                        {unfiledForms.length} form{unfiledForms.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3 pl-6">
                  {unfiledForms.map((form) => renderFormCard(form))}
                </CollapsibleContent>
              </Collapsible>
            );
          })()}
        </div>
      )}
    </div>
  );
});
