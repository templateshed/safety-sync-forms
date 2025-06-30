export const getFieldVisibility = (
  fieldId: string,
  conditionalLogic: any,
  formResponses: Record<string, any>
): { visible: boolean; required: boolean } => {
  // Always show all fields and use their base required status
  return { visible: true, required: false };
};
