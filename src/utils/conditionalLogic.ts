
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

export const evaluateConditionalLogic = (
  conditionalLogic: ConditionalLogic,
  formResponses: Record<string, any>
): { shouldShow: boolean; shouldRequire: boolean } => {
  if (!conditionalLogic || !conditionalLogic.rules.length) {
    return { shouldShow: true, shouldRequire: false };
  }

  const ruleResults = conditionalLogic.rules.map(rule => {
    const fieldValue = formResponses[rule.trigger_field_id];
    const triggerValues = rule.trigger_values;

    let conditionMet = false;

    switch (rule.operator) {
      case 'equals':
        if (Array.isArray(fieldValue)) {
          conditionMet = triggerValues.some(value => fieldValue.includes(value));
        } else {
          conditionMet = triggerValues.includes(String(fieldValue || ''));
        }
        break;

      case 'not_equals':
        if (Array.isArray(fieldValue)) {
          conditionMet = !triggerValues.some(value => fieldValue.includes(value));
        } else {
          conditionMet = !triggerValues.includes(String(fieldValue || ''));
        }
        break;

      case 'contains':
        const fieldStr = String(fieldValue || '').toLowerCase();
        conditionMet = triggerValues.some(value => 
          fieldStr.includes(value.toLowerCase())
        );
        break;

      case 'not_contains':
        const fieldStr2 = String(fieldValue || '').toLowerCase();
        conditionMet = !triggerValues.some(value => 
          fieldStr2.includes(value.toLowerCase())
        );
        break;

      case 'is_empty':
        conditionMet = !fieldValue || 
          (typeof fieldValue === 'string' && fieldValue.trim() === '') ||
          (Array.isArray(fieldValue) && fieldValue.length === 0);
        break;

      case 'is_not_empty':
        conditionMet = fieldValue && 
          (typeof fieldValue !== 'string' || fieldValue.trim() !== '') &&
          (!Array.isArray(fieldValue) || fieldValue.length > 0);
        break;

      default:
        conditionMet = false;
    }

    return { rule, conditionMet };
  });

  // Apply logic operator
  const overallConditionMet = conditionalLogic.logic_operator === 'AND'
    ? ruleResults.every(result => result.conditionMet)
    : ruleResults.some(result => result.conditionMet);

  // Determine actions
  let shouldShow = true;
  let shouldRequire = false;

  if (overallConditionMet) {
    // Find the primary action (priority: show/hide > require/unrequire)
    const showHideRules = ruleResults.filter(r => 
      r.rule.action === 'show' || r.rule.action === 'hide'
    );
    const requireRules = ruleResults.filter(r => 
      r.rule.action === 'require' || r.rule.action === 'unrequire'
    );

    if (showHideRules.length > 0) {
      // Use the first show/hide action
      const primaryAction = showHideRules[0].rule.action;
      shouldShow = primaryAction === 'show';
    }

    if (requireRules.length > 0) {
      // Use the first require/unrequire action
      const primaryAction = requireRules[0].rule.action;
      shouldRequire = primaryAction === 'require';
    }
  }

  return { shouldShow, shouldRequire };
};

export const getFieldVisibility = (
  fieldId: string,
  conditionalLogic: ConditionalLogic | undefined,
  formResponses: Record<string, any>
): { visible: boolean; required: boolean } => {
  if (!conditionalLogic) {
    return { visible: true, required: false };
  }

  const evaluation = evaluateConditionalLogic(conditionalLogic, formResponses);
  
  return {
    visible: evaluation.shouldShow,
    required: evaluation.shouldRequire
  };
};
