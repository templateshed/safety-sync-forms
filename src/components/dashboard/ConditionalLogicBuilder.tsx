import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Settings } from 'lucide-react';
import { ConditionalLogic, ConditionalRule } from '@/utils/conditionalLogic';

interface FormField {
  id: string;
  label: string;
  field_type: string;
  options?: any;
}

interface ConditionalLogicBuilderProps {
  field: FormField;
  fields: FormField[];
  conditionalLogic: ConditionalLogic | null;
  onChange: (logic: ConditionalLogic | null) => void;
}

export const ConditionalLogicBuilder: React.FC<ConditionalLogicBuilderProps> = ({
  field,
  fields,
  conditionalLogic,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Include the current field for self-referencing logic
  const triggerFields = fields;

  const handleAddRule = () => {
    const newRule: ConditionalRule = {
      id: Date.now().toString(),
      fieldId: '',
      operator: 'equals',
      value: '',
      logicalOperator: 'AND',
    };

    const updatedLogic: ConditionalLogic = {
      action: conditionalLogic?.action || 'show',
      rules: [...(conditionalLogic?.rules || []), newRule],
    };

    onChange(updatedLogic);
  };

  const handleUpdateRule = (index: number, updates: Partial<ConditionalRule>) => {
    if (!conditionalLogic) return;

    const updatedRules = [...conditionalLogic.rules];
    updatedRules[index] = { ...updatedRules[index], ...updates };

    onChange({
      ...conditionalLogic,
      rules: updatedRules,
    });
  };

  const handleRemoveRule = (index: number) => {
    if (!conditionalLogic) return;

    const updatedRules = conditionalLogic.rules.filter((_, i) => i !== index);
    
    if (updatedRules.length === 0) {
      onChange(null);
      setIsOpen(false);
    } else {
      onChange({
        ...conditionalLogic,
        rules: updatedRules,
      });
    }
  };

  const handleActionChange = (action: ConditionalLogic['action']) => {
    onChange({
      action,
      rules: conditionalLogic?.rules || [],
    });
  };

  const getOperatorOptions = (fieldType: string) => {
    const baseOptions = [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Does not equal' },
      { value: 'is_empty', label: 'Is empty' },
      { value: 'is_not_empty', label: 'Is not empty' },
    ];

    if (fieldType === 'select' || fieldType === 'radio') {
      return [
        ...baseOptions,
        { value: 'in', label: 'Is one of' },
        { value: 'not_in', label: 'Is not one of' },
      ];
    }

    if (fieldType === 'text') {
      return [
        ...baseOptions,
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does not contain' },
      ];
    }

    if (fieldType === 'number') {
      return [
        ...baseOptions,
        { value: 'greater_than', label: 'Greater than' },
        { value: 'less_than', label: 'Less than' },
      ];
    }

    return baseOptions;
  };

  const getFieldOptions = (fieldId: string) => {
    const triggerField = fields.find(f => f.id === fieldId);
    if (!triggerField?.options?.choices) return [];
    return triggerField.options.choices;
  };

  const renderValueInput = (rule: ConditionalRule, index: number) => {
    const triggerField = fields.find(f => f.id === rule.fieldId);
    
    if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') {
      return null;
    }

    // Handle multi-value selection for 'in' and 'not_in' operators
    if (rule.operator === 'in' || rule.operator === 'not_in') {
      if (triggerField?.field_type === 'select' || triggerField?.field_type === 'radio') {
        const options = getFieldOptions(rule.fieldId);
        const selectedValues = Array.isArray(rule.value) ? rule.value : [];
        
        return (
          <div className="space-y-2">
            {options.map((option: string, optIndex: number) => (
              <div key={optIndex} className="flex items-center space-x-2">
                <Checkbox
                  id={`rule-${rule.id}-option-${optIndex}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option);
                    handleUpdateRule(index, { value: newValues });
                  }}
                />
                <Label htmlFor={`rule-${rule.id}-option-${optIndex}`} className="text-xs">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      }
    }

    // Single value selection for other operators
    if (triggerField?.field_type === 'select' || triggerField?.field_type === 'radio') {
      const options = getFieldOptions(rule.fieldId);
      return (
        <Select
          value={String(rule.value)}
          onValueChange={(value) => handleUpdateRule(index, { value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option: string, optIndex: number) => (
              <SelectItem key={optIndex} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        type={triggerField?.field_type === 'number' ? 'number' : 'text'}
        value={String(rule.value)}
        onChange={(e) => handleUpdateRule(index, { value: e.target.value })}
        placeholder="Enter value"
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Conditional Logic</Label>
        <div className="flex items-center gap-2">
          {conditionalLogic && (
            <Badge variant="secondary" className="text-xs">
              {conditionalLogic.rules.length} rule{conditionalLogic.rules.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isOpen && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Configure Conditional Logic</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Action</Label>
              <Select
                value={conditionalLogic?.action || 'show'}
                onValueChange={handleActionChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="show">Show field when</SelectItem>
                  <SelectItem value="hide">Hide field when</SelectItem>
                  <SelectItem value="require">Require field when</SelectItem>
                  <SelectItem value="disable">Disable field when</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Rules</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRule}
                  disabled={triggerFields.length === 0}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Rule
                </Button>
              </div>

              {conditionalLogic?.rules.map((rule, index) => (
                <Card key={rule.id} className="p-3 bg-muted/20">
                  <div className="space-y-3">
                    {index > 0 && (
                      <div>
                        <Select
                          value={rule.logicalOperator || 'AND'}
                          onValueChange={(value: 'AND' | 'OR') =>
                            handleUpdateRule(index, { logicalOperator: value })
                          }
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <Label className="text-xs">Field</Label>
                          <Select
                            value={rule.fieldId}
                            onValueChange={(value) => handleUpdateRule(index, { fieldId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select field" />
                            </SelectTrigger>
                            <SelectContent>
                              {triggerFields.map((f) => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.label}{f.id === field.id ? ' (This field)' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-3">
                          <Label className="text-xs">Operator</Label>
                          <Select
                            value={rule.operator}
                            onValueChange={(value) => handleUpdateRule(index, { operator: value as any })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {getOperatorOptions(
                                fields.find(f => f.id === rule.fieldId)?.field_type || 'text'
                              ).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-4">
                          {(rule.operator !== 'in' && rule.operator !== 'not_in') && renderValueInput(rule, index) && (
                            <>
                              <Label className="text-xs">Value</Label>
                              {renderValueInput(rule, index)}
                            </>
                          )}
                        </div>

                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRule(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {(rule.operator === 'in' || rule.operator === 'not_in') && (
                        <div>
                          <Label className="text-xs">Values</Label>
                          {renderValueInput(rule, index)}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {triggerFields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add more fields to create conditional logic rules.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};