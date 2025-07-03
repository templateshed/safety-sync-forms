export interface ConditionalRule {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean;
  logicalOperator?: 'AND' | 'OR';
}

export interface ConditionalLogic {
  action: 'show' | 'hide' | 'require' | 'disable';
  rules: ConditionalRule[];
}

export interface FormFieldData {
  [fieldId: string]: string | number | boolean | string[];
}

export const evaluateRule = (rule: ConditionalRule, formData: FormFieldData): boolean => {
  const fieldValue = formData[rule.fieldId];
  
  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;
    case 'not_equals':
      return fieldValue !== rule.value;
    case 'contains':
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return fieldValue.toLowerCase().includes(rule.value.toLowerCase());
      }
      if (Array.isArray(fieldValue) && typeof rule.value === 'string') {
        return fieldValue.includes(rule.value);
      }
      return false;
    case 'not_contains':
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return !fieldValue.toLowerCase().includes(rule.value.toLowerCase());
      }
      if (Array.isArray(fieldValue) && typeof rule.value === 'string') {
        return !fieldValue.includes(rule.value);
      }
      return true;
    case 'greater_than':
      return Number(fieldValue) > Number(rule.value);
    case 'less_than':
      return Number(fieldValue) < Number(rule.value);
    case 'is_empty':
      return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
    case 'is_not_empty':
      return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
    default:
      return false;
  }
};

export const evaluateConditionalLogic = (logic: ConditionalLogic, formData: FormFieldData): boolean => {
  if (!logic.rules || logic.rules.length === 0) {
    return true;
  }

  let result = evaluateRule(logic.rules[0], formData);
  
  for (let i = 1; i < logic.rules.length; i++) {
    const rule = logic.rules[i];
    const ruleResult = evaluateRule(rule, formData);
    
    if (rule.logicalOperator === 'OR') {
      result = result || ruleResult;
    } else {
      // Default to AND
      result = result && ruleResult;
    }
  }
  
  return result;
};

export const shouldShowField = (fieldLogic: ConditionalLogic | null, formData: FormFieldData): boolean => {
  if (!fieldLogic) return true;
  
  const conditionMet = evaluateConditionalLogic(fieldLogic, formData);
  
  if (fieldLogic.action === 'show') {
    return conditionMet;
  } else if (fieldLogic.action === 'hide') {
    return !conditionMet;
  }
  
  return true;
};

export const shouldRequireField = (fieldLogic: ConditionalLogic | null, formData: FormFieldData): boolean => {
  if (!fieldLogic) return false;
  
  const conditionMet = evaluateConditionalLogic(fieldLogic, formData);
  
  return fieldLogic.action === 'require' && conditionMet;
};

export const shouldDisableField = (fieldLogic: ConditionalLogic | null, formData: FormFieldData): boolean => {
  if (!fieldLogic) return false;
  
  const conditionMet = evaluateConditionalLogic(fieldLogic, formData);
  
  return fieldLogic.action === 'disable' && conditionMet;
};

export const getFieldVisibility = (
  fieldId: string,
  conditionalLogic: ConditionalLogic | null,
  formResponses: FormFieldData,
  baseRequired: boolean = false
): { visible: boolean; required: boolean } => {
  if (!conditionalLogic) {
    return { visible: true, required: baseRequired };
  }

  const conditionMet = evaluateConditionalLogic(conditionalLogic, formResponses);
  
  let visible = true;
  let required = baseRequired;

  switch (conditionalLogic.action) {
    case 'show':
      visible = conditionMet;
      break;
    case 'hide':
      visible = !conditionMet;
      break;
    case 'require':
      required = baseRequired || conditionMet;
      break;
    case 'disable':
      // For now, we'll handle disable as part of the field rendering logic
      break;
  }

  return { visible, required };
};
