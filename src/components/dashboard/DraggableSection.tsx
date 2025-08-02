import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { SectionContainer } from './SectionContainer';

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

interface DraggableSectionProps {
  section: FormSection;
  isEditing: boolean;
  children: React.ReactNode;
  onToggleCollapse: () => void;
  onEdit: () => void;
  onSave: (title: string, description?: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  isReadOnly?: boolean;
}

export const DraggableSection: React.FC<DraggableSectionProps> = ({
  section,
  isEditing,
  children,
  onToggleCollapse,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isReadOnly = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.id,
    data: {
      type: 'section',
      section,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing mt-2 z-10"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Section Container */}
        <div className="flex-1">
          <SectionContainer
            id={section.id}
            title={section.title}
            description={section.description}
            isCollapsible={section.is_collapsible}
            isCollapsed={section.is_collapsed}
            isEditing={isEditing}
            onToggleCollapse={onToggleCollapse}
            onEdit={onEdit}
            onSave={onSave}
            onCancel={onCancel}
            onDelete={onDelete}
            isReadOnly={isReadOnly}
          >
            {children}
          </SectionContainer>
        </div>
      </div>
    </div>
  );
};