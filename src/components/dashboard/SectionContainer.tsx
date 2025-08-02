import React from 'react';
import { Card } from '@/components/ui/card';
import { SectionHeader } from './SectionHeader';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';

interface SectionContainerProps {
  id: string;
  title: string;
  description?: string;
  isCollapsible: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  children: React.ReactNode;
  onToggleCollapse: () => void;
  onEdit: () => void;
  onSave: (title: string, description?: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export const SectionContainer: React.FC<SectionContainerProps> = ({
  id,
  title,
  description,
  isCollapsible,
  isCollapsed,
  isEditing,
  children,
  onToggleCollapse,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isReadOnly = false,
}) => {
  return (
    <Card className="overflow-hidden">
      <Collapsible open={!isCollapsed}>
        <SectionHeader
          title={title}
          description={description}
          isCollapsed={isCollapsed}
          isCollapsible={isCollapsible}
          isEditing={isEditing}
          onToggleCollapse={onToggleCollapse}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          onDelete={onDelete}
          isReadOnly={isReadOnly}
        />
        
        <CollapsibleContent>
          <div className="p-4 space-y-4">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};