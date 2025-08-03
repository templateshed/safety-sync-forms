interface FormField {
  id: string;
  field_type: string;
  label: string;
  section_id?: string;
  conditional_logic?: any;
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

interface FormLogicConfig {
  fields: FormField[];
  sections: FormSection[];
  responses: Record<string, any>;
}

export class FormLogicEngine {
  private config: FormLogicConfig;
  private visibleFields: Set<string>;
  private visibleSections: Set<string>;

  constructor(config: FormLogicConfig) {
    this.config = config;
    this.visibleFields = new Set();
    this.visibleSections = new Set();
    this.initializeVisibility();
  }

  private initializeVisibility() {
    // Start with all sections visible
    this.config.sections.forEach(section => {
      this.visibleSections.add(section.id);
    });

    // Initialize field visibility based on branching logic
    this.updateVisibility();
  }

  updateVisibility() {
    // Reset visible fields and sections
    this.visibleFields.clear();
    this.visibleSections.clear();

    // Reset sections to be visible by default
    this.config.sections.forEach(section => {
      this.visibleSections.add(section.id);
    });

    // Find fields that should be visible initially (no dependencies)
    const fieldsWithBranching = this.getFieldsWithBranching();
    const dependentFields = new Set<string>();
    const dependentSections = new Set<string>();

    // Collect all fields and sections that are targets of branching rules
    fieldsWithBranching.forEach(field => {
      const rules = this.getBranchingRules(field);
      rules.forEach(rule => {
        if (rule.targetType === 'field') {
          dependentFields.add(rule.goToTarget);
        } else if (rule.targetType === 'section') {
          dependentSections.add(rule.goToTarget);
        }
      });
    });

    // Add fields that are not dependent on any branching
    this.config.fields.forEach(field => {
      if (!dependentFields.has(field.id)) {
        this.visibleFields.add(field.id);
      }
    });

    // Hide sections that are dependent on branching by default
    dependentSections.forEach(sectionId => {
      this.visibleSections.delete(sectionId);
    });

    // Evaluate branching rules to show conditional fields and sections
    this.evaluateBranchingRules();
  }

  private evaluateBranchingRules() {
    const fieldsWithBranching = this.getFieldsWithBranching();

    fieldsWithBranching.forEach(field => {
      const fieldValue = this.config.responses[field.id];
      if (!fieldValue) return;

      const rules = this.getBranchingRules(field);
      const selectedValues = Array.isArray(fieldValue) ? fieldValue : [fieldValue];

      selectedValues.forEach(value => {
        const matchingRule = rules.find(rule => rule.optionValue === value);
        if (matchingRule && matchingRule.goToTarget) {
          if (matchingRule.targetType === 'field') {
            this.visibleFields.add(matchingRule.goToTarget);
            // Also make fields visible up to the target
            this.makeFieldsVisibleUpTo(matchingRule.goToTarget);
          } else if (matchingRule.targetType === 'section') {
            this.visibleSections.add(matchingRule.goToTarget);
            // Make all fields in target section visible
            this.makeFieldsInSectionVisible(matchingRule.goToTarget);
          }
        }
      });
    });
  }

  private makeFieldsVisibleUpTo(targetFieldId: string) {
    const targetField = this.config.fields.find(f => f.id === targetFieldId);
    if (!targetField) return;

    // Make the target field visible
    this.visibleFields.add(targetFieldId);

    // If target field is in a section, make sure the section is visible
    if (targetField.section_id) {
      this.visibleSections.add(targetField.section_id);
    }
  }

  private makeFieldsInSectionVisible(sectionId: string) {
    this.visibleSections.add(sectionId);
    this.config.fields
      .filter(field => field.section_id === sectionId)
      .forEach(field => {
        this.visibleFields.add(field.id);
      });
  }

  private getFieldsWithBranching(): FormField[] {
    return this.config.fields.filter(field => {
      return ['select', 'radio', 'checkbox'].includes(field.field_type) &&
             field.conditional_logic?.enabled &&
             field.conditional_logic?.rules?.length > 0;
    });
  }

  private getBranchingRules(field: FormField): BranchingRule[] {
    return field.conditional_logic?.rules || [];
  }

  updateResponses(responses: Record<string, any>) {
    this.config.responses = responses;
    this.updateVisibility();
  }

  isFieldVisible(fieldId: string): boolean {
    return this.visibleFields.has(fieldId);
  }

  isSectionVisible(sectionId: string): boolean {
    return this.visibleSections.has(sectionId);
  }

  getVisibleFields(): string[] {
    return Array.from(this.visibleFields);
  }

  getVisibleSections(): string[] {
    return Array.from(this.visibleSections);
  }

  // Get next visible field for navigation
  getNextVisibleField(currentFieldId: string): string | null {
    const visibleFieldsArray = this.getVisibleFields();
    const currentIndex = visibleFieldsArray.indexOf(currentFieldId);
    
    if (currentIndex === -1 || currentIndex === visibleFieldsArray.length - 1) {
      return null;
    }
    
    return visibleFieldsArray[currentIndex + 1];
  }
}