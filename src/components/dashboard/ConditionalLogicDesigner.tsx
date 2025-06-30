
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2 } from 'lucide-react';

interface FormField {
  id: string;
  field_type: string;
  label: string;
  options?: any;
}

interface ConditionalRule {
  id: string;
  trigger_field_id: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
  trigger_values: string[];
  action: 'show' | 'hide' | 'require' | 'unrequire';
}

interface ConditionalLogic {
  logic_operator: 'AND' | 'OR';
  rules: ConditionalRule[];
}

interface ConditionalLogicDesignerProps {
  fields: FormField[];
  currentFieldId: string;
  conditionalLogic?: ConditionalLogic;
  onLogicChange: (logic: ConditionalLogic | undefined) => void;
}

export const ConditionalLogicDesigner: React.FC<ConditionalLogicDesignerProps> = ({
  fields,
  currentFieldId,
  conditionalLogic,
  onLogicChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter out the current field and fields that come after it (can't reference future fields)
  const availableFields = fields.filter((field, index) => {
    const currentFieldIndex = fields.findIndex(f => f.id === currentFieldId);
    return field.id !== currentFieldId && index < currentFieldIndex;
  });

  const addRule = () => {
    const newRule: ConditionalRule = {
      id: Date.now().toString(),
      trigger_field_id: '',
      operator: 'equals',
      trigger_values: [''],
      action: 'show'
    };

    const updatedLogic: ConditionalLogic = {
      logic_operator: conditionalLogic?.logic_operator || 'AND',
      rules: [...(conditionalLogic?.rules || []), newRule]
    };

    onLogicChange(updatedLogic);
  };

  const updateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    if (!conditionalLogic) return;

    const updatedRules = conditionalLogic.rules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );

    onLogicChange({
      ...conditionalLogic,
      rules: updatedRules
    });
  };

  const removeRule = (ruleId: string) => {
    if (!conditionalLogic) return;

    const updatedRules = conditionalLogic.rules.filter(rule => rule.id !== ruleId);
    
    if (updatedRules.length === 0) {
      onLogicChange(undefined);
      setIsOpen(false);
    } else {
      onLogicChange({
        ...conditionalLogic,
        rules: updatedRules
      });
    }
  };

  const updateLogicOperator = (operator: 'AND' | 'OR') => {
    if (!conditionalLogic) return;

    onLogicChange({
      ...conditionalLogic,
      logic_operator: operator
    });
  };

  const addTriggerValue = (ruleId: string) => {
    if (!conditionalLogic) return;

    const rule = conditionalLogic.rules.find(r => r.id === ruleId);
    if (!rule) return;

    updateRule(ruleId, {
      trigger_values: [...rule.trigger_values, '']
    });
  };

  const updateTriggerValue = (ruleId: string, valueIndex: number, value: string) => {
    if (!conditionalLogic) return;

    const rule = conditionalLogic.rules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedValues = [...rule.trigger_values];
    updatedValues[valueIndex] = value;

    updateRule(ruleId, {
      trigger_values: updatedValues
    });
  };

  const removeTriggerValue = (ruleId: string, valueIndex: number) => {
    if (!conditionalLogic) return;

    const rule = conditionalLogic.rules.find(r => r.id === ruleId);
    if (!rule) return;

    const updatedValues = rule.trigger_values.filter((_, i) => i !== valueIndex);

    updateRule(ruleId, {
      trigger_values: updatedValues
    });
  };

  const getFieldOptions = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return [];

    if (field.field_type === 'select' || field.field_type === 'radio') {
      return field.options?.choices || [];
    }

    return [];
  };

  const renderTriggerValueInput = (rule: ConditionalRule, valueIndex: number) => {
    const triggerField = fields.find(f => f.id === rule.trigger_field_id);
    const fieldOptions = getFieldOptions(rule.trigger_field_id);

    if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') {
      return null; // These operators don't need values
    }

    if (fieldOptions.length > 0) {
      return (
        <Select
          value={rule.trigger_values[valueIndex] || ''}
          onValueChange={(value) => updateTriggerValue(rule.id, valueIndex, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            {fieldOptions.map((option: string, index: number) => (
              <SelectItem key={index} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        value={rule.trigger_values[valueIndex] || ''}
        onChange={(e) => updateTriggerValue(rule.id, valueIndex, e.target.value)}
        placeholder="Enter value"
      />
    );
  };

  if (!isOpen && !conditionalLogic) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        disabled={availableFields.length === 0}
      >
        Add Conditional Logic
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Conditional Logic</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              onLogicChange(undefined);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {conditionalLogic && conditionalLogic.rules.length > 1 && (
          <div>
            <Label className="text-xs">Logic Operator</Label>
            <Select
              value={conditionalLogic.logic_operator}
              onValueChange={(value: 'AND' | 'OR') => updateLogicOperator(value)}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">AND</SelectItem>
                <SelectItem value="OR">OR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {conditionalLogic?.rules.map((rule, ruleIndex) => (
          <div key={rule.id} className="space-y-3 p-3 border rounded-lg bg-gray-50">
            {ruleIndex > 0 && (
              <div className="text-center">
                <Badge variant="secondary" className="text-xs">
                  {conditionalLogic.logic_operator}
                </Badge>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">When Field</Label>
                <Select
                  value={rule.trigger_field_id}
                  onValueChange={(value) => updateRule(rule.id, { trigger_field_id: value, trigger_values: [''] })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Operator</Label>
                <Select
                  value={rule.operator}
                  onValueChange={(value: ConditionalRule['operator']) => updateRule(rule.id, { operator: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="not_contains">Not Contains</SelectItem>
                    <SelectItem value="is_empty">Is Empty</SelectItem>
                    <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Action</Label>
                <Select
                  value={rule.action}
                  onValueChange={(value: ConditionalRule['action']) => updateRule(rule.id, { action: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show">Show Field</SelectItem>
                    <SelectItem value="hide">Hide Field</SelectItem>
                    <SelectItem value="require">Make Required</SelectItem>
                    <SelectItem value="unrequire">Make Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Values</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTriggerValue(rule.id)}
                    className="h-6 px-2"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {rule.trigger_values.map((value, valueIndex) => (
                    <div key={valueIndex} className="flex items-center space-x-2">
                      {renderTriggerValueInput(rule, valueIndex)}
                      {rule.trigger_values.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeTriggerValue(rule.id, valueIndex)}
                          className="h-9 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRule}
          disabled={availableFields.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>

        {availableFields.length === 0 && (
          <p className="text-xs text-gray-500">
            Add fields above this one to enable conditional logic
          </p>
        )}
      </CardContent>
    </Card>
  );
};
