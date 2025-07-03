export interface ConditionalRule {
  id: string;
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in';
  value: string | number | boolean | string[];
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
  
  // If the field doesn't exist in formData, return false to prevent showing fields
  if (!(rule.fieldId in formData)) {
    console.warn(`Conditional logic references non-existent field: ${rule.fieldId}`);
    return false;
  }
  
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
    case 'in':
      if (Array.isArray(rule.value)) {
        return rule.value.includes(String(fieldValue));
      }
      return fieldValue === rule.value;
    case 'not_in':
      if (Array.isArray(rule.value)) {
        return !rule.value.includes(String(fieldValue));
      }
      return fieldValue !== rule.value;
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

// Validation functions for conditional logic
export const validateConditionalLogic = (logic: ConditionalLogic | null, availableFields?: Array<{ id: string }>): string[] => {
  const errors: string[] = [];

  if (!logic) return errors;

  if (!logic.action || !['show', 'hide', 'require', 'disable'].includes(logic.action)) {
    errors.push('Invalid action type');
  }

  if (!logic.rules || !Array.isArray(logic.rules) || logic.rules.length === 0) {
    errors.push('At least one rule is required');
    return errors;
  }

  logic.rules.forEach((rule, index) => {
    if (!rule.id || typeof rule.id !== 'string') {
      errors.push(`Rule ${index + 1}: Invalid rule ID`);
    }

    if (!rule.fieldId || typeof rule.fieldId !== 'string') {
      errors.push(`Rule ${index + 1}: Field ID is required`);
    }

    // Validate that the referenced field exists
    if (availableFields && rule.fieldId) {
      const fieldExists = availableFields.some(field => field.id === rule.fieldId);
      if (!fieldExists) {
        errors.push(`Rule ${index + 1}: Referenced field "${rule.fieldId}" does not exist`);
      }
    }

    if (!rule.operator || !['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'in', 'not_in'].includes(rule.operator)) {
      errors.push(`Rule ${index + 1}: Invalid operator`);
    }

    if (rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' && (rule.value === undefined || rule.value === null)) {
      errors.push(`Rule ${index + 1}: Value is required for this operator`);
    }

    if (index > 0 && (!rule.logicalOperator || !['AND', 'OR'].includes(rule.logicalOperator))) {
      errors.push(`Rule ${index + 1}: Logical operator is required for non-first rules`);
    }
  });

  return errors;
};

export const checkCircularReferences = (fields: Array<{ id: string; conditional_logic?: ConditionalLogic | null }>): string[] => {
  const errors: string[] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (fieldId: string, path: string[]): boolean => {
    if (recursionStack.has(fieldId)) {
      errors.push(`Circular reference detected: ${path.join(' -> ')} -> ${fieldId}`);
      return true;
    }

    if (visited.has(fieldId)) {
      return false;
    }

    visited.add(fieldId);
    recursionStack.add(fieldId);

    const field = fields.find(f => f.id === fieldId);
    if (field?.conditional_logic?.rules) {
      for (const rule of field.conditional_logic.rules) {
        if (dfs(rule.fieldId, [...path, fieldId])) {
          return true;
        }
      }
    }

    recursionStack.delete(fieldId);
    return false;
  };

  fields.forEach(field => {
    if (field.conditional_logic) {
      dfs(field.id, []);
    }
  });

  return errors;
};

export const sanitizeConditionalLogic = (logic: ConditionalLogic | null, availableFields?: Array<{ id: string }>): ConditionalLogic | null => {
  if (!logic) return null;

  try {
    // Deep clone to avoid mutations
    const sanitized = JSON.parse(JSON.stringify(logic));
    
    // Ensure all required properties exist
    if (!sanitized.action || !sanitized.rules) {
      return null;
    }

    // Clean and validate rules
    sanitized.rules = sanitized.rules.filter((rule: any) => {
      if (!rule || typeof rule !== 'object' || !rule.id || !rule.fieldId || !rule.operator) {
        return false;
      }
      
      // If availableFields is provided, check if the referenced field exists
      if (availableFields) {
        const fieldExists = availableFields.some(field => field.id === rule.fieldId);
        if (!fieldExists) {
          console.warn(`Removing conditional rule with invalid field reference: ${rule.fieldId}`);
          return false;
        }
      }
      
      return true;
    });

    if (sanitized.rules.length === 0) {
      return null;
    }

    return sanitized;
  } catch (error) {
    console.error('Error sanitizing conditional logic:', error);
    return null;
  }
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
