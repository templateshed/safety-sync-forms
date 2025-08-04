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
    console.log('FormLogicEngine: Initializing with config:', config);
    console.log('FormLogicEngine: All fields:', config.fields);
    console.log('FormLogicEngine: Fields with conditional logic:', config.fields.filter(f => f.conditional_logic?.enabled));
    this.initializeVisibility();
    console.log('FormLogicEngine: After initialization - visible fields:', Array.from(this.visibleFields));
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

    // Start with all sections visible by default
    this.config.sections.forEach(section => {
      this.visibleSections.add(section.id);
    });

    // Find fields with branching and collect all target fields/sections
    const fieldsWithBranching = this.getFieldsWithBranching();
    
    // If no fields have branching logic, show all fields
    if (fieldsWithBranching.length === 0) {
      console.log('FormLogicEngine: No branching logic found, showing all fields');
      this.config.fields.forEach(field => {
        this.visibleFields.add(field.id);
      });
      return;
    }

    const targetFields = new Set<string>();
    const targetSections = new Set<string>();

    // Collect all fields and sections that are targets of branching rules
    fieldsWithBranching.forEach(field => {
      const rules = this.getBranchingRules(field);
      console.log(`FormLogicEngine: Field ${field.id} has branching rules:`, rules);
      rules.forEach(rule => {
        console.log(`FormLogicEngine: Processing rule - when ${rule.optionValue} selected, go to ${rule.targetType} ${rule.goToTarget}`);
        // Only add valid targets that exist in current form structure
        if (rule.targetType === 'field' && this.config.fields.find(f => f.id === rule.goToTarget)) {
          targetFields.add(rule.goToTarget);
          console.log(`FormLogicEngine: Added ${rule.goToTarget} to target fields`);
        } else if (rule.targetType === 'section' && this.config.sections.find(s => s.id === rule.goToTarget)) {
          targetSections.add(rule.goToTarget);
          console.log(`FormLogicEngine: Added ${rule.goToTarget} to target sections`);
        }
      });
    });

    console.log('FormLogicEngine: Target fields that should be hidden:', Array.from(targetFields));
    console.log('FormLogicEngine: Target sections that should be hidden:', Array.from(targetSections));

    // Add only fields that are NOT targets of branching rules
    // Target fields should be hidden by default and only shown when triggered
    this.config.fields.forEach(field => {
      if (!targetFields.has(field.id)) {
        this.visibleFields.add(field.id);
      }
    });

    // Hide sections that are targets of branching rules by default
    targetSections.forEach(sectionId => {
      this.visibleSections.delete(sectionId);
      // Also hide all fields in target sections
      this.config.fields
        .filter(field => field.section_id === sectionId)
        .forEach(field => {
          this.visibleFields.delete(field.id);
        });
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
    console.log('FormLogicEngine: Updating responses:', responses);
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