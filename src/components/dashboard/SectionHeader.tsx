import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Trash2, GripVertical } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  description?: string;
  isCollapsed: boolean;
  isCollapsible: boolean;
  isEditing: boolean;
  onToggleCollapse: () => void;
  onEdit: () => void;
  onSave: (title: string, description?: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  isCollapsed,
  isCollapsible,
  isEditing,
  onToggleCollapse,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isReadOnly = false,
}) => {
  const [editTitle, setEditTitle] = React.useState(title);
  const [editDescription, setEditDescription] = React.useState(description || '');

  React.useEffect(() => {
    if (isEditing) {
      setEditTitle(title);
      setEditDescription(description || '');
    }
  }, [isEditing, title, description]);

  const handleSave = () => {
    onSave(editTitle, editDescription);
  };

  if (isEditing) {
    return (
      <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-t-lg border-b">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
        <div className="flex-1 space-y-3">
          <div>
            <Label htmlFor="section-title">Section Title</Label>
            <Input
              id="section-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Enter section title"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="section-description">Description (Optional)</Label>
            <Textarea
              id="section-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Enter section description"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-t-lg border-b hover:bg-muted/50 transition-colors">
      <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
      
      {isCollapsible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-1 h-6 w-6"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      )}
      
      <div className={`flex-1 ${!isReadOnly ? 'cursor-pointer' : ''}`} onClick={!isReadOnly ? onEdit : undefined}>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      
      {!isReadOnly && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="p-1 h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};