import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { BranchingRulesBuilder } from './BranchingRulesBuilder';

interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  order_index: number;
  section_id?: string;
  conditional_logic?: {
    enabled: boolean;
    rules: Array<{
      optionValue: string;
      goToTarget: string;
      targetType: 'field' | 'section';
    }>;
  };
}

interface FormSection {
  id: string;
  title: string;
}

interface DraggableFieldProps {
  field: FormField;
  index: number;
  onUpdate: (index: number, updates: Partial<FormField>) => void;
  onRemove: (index: number) => void;
  onAddOption: (fieldIndex: number) => void;
  onUpdateOption: (fieldIndex: number, optionIndex: number, value: string) => void;
  onRemoveOption: (fieldIndex: number, optionIndex: number) => void;
  availableFields: FormField[];
  availableSections: FormSection[];
}

export const DraggableField: React.FC<DraggableFieldProps> = ({
  field,
  index,
  onUpdate,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  availableFields,
  availableSections,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: {
      type: 'field',
      field,
      index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOptionsField = ['select', 'radio', 'checkbox'].includes(field.field_type);
  const isPhotoField = field.field_type === 'photo';
  const options = field.options?.choices || [];
  const isTodaysDateField = field.id === 'todays-date-field' || field.label === "Today's Date";
  const supportsBranching = isOptionsField && !isTodaysDateField;
  const branchingEnabled = field.conditional_logic?.enabled || false;

  const handleBranchingToggle = (enabled: boolean) => {
    onUpdate(index, {
      conditional_logic: {
        enabled,
        rules: enabled ? (field.conditional_logic?.rules || []) : [],
      },
    });
  };

  const handleBranchingRulesChange = (rules: Array<{ optionValue: string; goToTarget: string; targetType: 'field' | 'section' }>) => {
    onUpdate(index, {
      conditional_logic: {
        enabled: branchingEnabled,
        rules,
      },
    });
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="flex-shrink-0 p-1 hover:bg-muted rounded cursor-grab active:cursor-grabbing mt-2"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex-1 space-y-3">
              {/* Field Type */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Field Type</Label>
                  <Select
                    value={field.field_type}
                    onValueChange={(value) => onUpdate(index, { field_type: value as any })}
                    disabled={isTodaysDateField}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="textarea">Text Area</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="radio">Radio</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                      <SelectItem value="signature">Signature</SelectItem>
                      <SelectItem value="photo">Photo Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Required Toggle */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`required-${field.id}`}
                    checked={field.required}
                    onCheckedChange={(checked) => onUpdate(index, { required: checked })}
                    disabled={isTodaysDateField}
                  />
                  <Label htmlFor={`required-${field.id}`}>Required</Label>
                </div>

                {/* Remove Button */}
                {!isTodaysDateField && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(index)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Field Label */}
              <div>
                <Label>Label</Label>
                <Input
                  value={field.label}
                  onChange={(e) => onUpdate(index, { label: e.target.value })}
                  placeholder="Field label"
                  disabled={isTodaysDateField}
                />
              </div>

              {/* Field Placeholder */}
              {!['checkbox', 'radio', 'signature', 'date', 'photo'].includes(field.field_type) && (
                <div>
                  <Label>Placeholder</Label>
                  <Input
                    value={field.placeholder || ''}
                    onChange={(e) => onUpdate(index, { placeholder: e.target.value })}
                    placeholder="Field placeholder"
                  />
                </div>
              )}

              {/* Options for select, radio, checkbox */}
              {isOptionsField && (
                <div>
                  <Label>Options</Label>
                  <div className="space-y-2">
                    {options.map((option: string, optionIndex: number) => (
                      <div key={optionIndex} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => onUpdateOption(index, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRemoveOption(index, optionIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAddOption(index)}
                    >
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              {/* Photo field settings */}
              {isPhotoField && (
                <div>
                  <Label>Photo Settings</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      id={`multiple-${field.id}`}
                      checked={field.options?.multiple || false}
                      onCheckedChange={(checked) => 
                        onUpdate(index, { 
                          options: { ...field.options, multiple: checked } 
                        })
                      }
                    />
                    <Label htmlFor={`multiple-${field.id}`}>Allow multiple photos</Label>
                  </div>
                </div>
              )}

              {/* Branching Logic Settings */}
              {supportsBranching && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Switch
                      id={`branching-${field.id}`}
                      checked={branchingEnabled}
                      onCheckedChange={handleBranchingToggle}
                    />
                    <Label htmlFor={`branching-${field.id}`}>Enable Branching Logic</Label>
                  </div>
                  
                  {branchingEnabled && options.length > 0 && (
                    <BranchingRulesBuilder
                      fieldOptions={options}
                      currentRules={field.conditional_logic?.rules || []}
                      availableFields={availableFields.filter(f => f.id !== field.id)}
                      availableSections={availableSections}
                      onRulesChange={handleBranchingRulesChange}
                    />
                  )}
                  
                  {branchingEnabled && options.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Add options first to configure branching logic.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};