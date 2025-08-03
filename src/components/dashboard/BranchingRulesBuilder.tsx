import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  field_type: string;
  section_id?: string;
}

interface FormSection {
  id: string;
  title: string;
}

interface BranchingRule {
  optionValue: string;
  goToTarget: string;
  targetType: 'field' | 'section';
}

interface BranchingRulesBuilderProps {
  fieldOptions: string[];
  currentRules: BranchingRule[];
  availableFields: FormField[];
  availableSections: FormSection[];
  onRulesChange: (rules: BranchingRule[]) => void;
}

export const BranchingRulesBuilder: React.FC<BranchingRulesBuilderProps> = ({
  fieldOptions,
  currentRules,
  availableFields,
  availableSections,
  onRulesChange,
}) => {
  console.log('BranchingRulesBuilder: Current rules:', currentRules);
  console.log('BranchingRulesBuilder: Available fields:', availableFields.map(f => ({ id: f.id, label: f.label })));
  console.log('BranchingRulesBuilder: Available sections:', availableSections.map(s => ({ id: s.id, title: s.title })));
  const addRule = (optionValue: string) => {
    const existingRule = currentRules.find(rule => rule.optionValue === optionValue);
    if (!existingRule) {
      const newRule: BranchingRule = {
        optionValue,
        goToTarget: '',
        targetType: 'field',
      };
      onRulesChange([...currentRules, newRule]);
    }
  };

  const updateRule = (optionValue: string, updates: Partial<BranchingRule>) => {
    const updatedRules = currentRules.map(rule =>
      rule.optionValue === optionValue ? { ...rule, ...updates } : rule
    );
    onRulesChange(updatedRules);
  };

  const removeRule = (optionValue: string) => {
    const filteredRules = currentRules.filter(rule => rule.optionValue !== optionValue);
    onRulesChange(filteredRules);
  };

  const getTargetOptions = (targetType: 'field' | 'section', currentGoToTarget?: string) => {
    let options;
    if (targetType === 'field') {
      options = availableFields.map(field => ({
        value: field.id,
        label: field.label || 'Untitled Field',
      }));
    } else {
      options = availableSections.map(section => ({
        value: section.id,
        label: section.title || 'Untitled Section',
      }));
    }
    
    // If the current target is not in available options, add it as a placeholder
    if (currentGoToTarget && !options.find(opt => opt.value === currentGoToTarget)) {
      options.unshift({
        value: currentGoToTarget,
        label: `[Missing] ${currentGoToTarget.substring(0, 8)}...`,
      });
    }
    
    return options;
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Branching Rules</Label>
      
      <div className="space-y-3">
        {fieldOptions.map((option, index) => {
          const existingRule = currentRules.find(rule => rule.optionValue === option);
          
          return (
            <div key={index} className="p-3 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">When "{option}" is selected:</span>
                {!existingRule ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addRule(option)}
                  >
                    Add Rule
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRule(option)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {existingRule && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Go to</Label>
                    <Select
                      value={existingRule.targetType}
                      onValueChange={(value: 'field' | 'section') => 
                        updateRule(option, { targetType: value, goToTarget: '' })
                      }
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="field">Field</SelectItem>
                        <SelectItem value="section">Section</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Target</Label>
                    <Select
                      value={existingRule.goToTarget}
                      onValueChange={(value) => updateRule(option, { goToTarget: value })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                       <SelectContent>
                         {getTargetOptions(existingRule.targetType, existingRule.goToTarget).map((target) => (
                           <SelectItem key={target.value} value={target.value}>
                             {target.label}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};