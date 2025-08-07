import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Plus, 
  Settings, 
  Users, 
  QrCode, 
  Share, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb,
  Clock,
  Eye,
  Download,
  BarChart3
} from 'lucide-react';

export const Documentation = () => {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Form Creator User Guide</CardTitle>
              <CardDescription>
                Complete guide to creating, managing, and analyzing your forms
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Accordion type="single" collapsible className="space-y-4">
            
            {/* Getting Started */}
            <AccordionItem value="getting-started" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Getting Started
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Creating Your First Form
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      Click the "Create Form" button in the sidebar to start building your first form. You'll be taken to the Form Builder where you can:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Add a form title and description</li>
                      <li>Drag and drop field components from the toolbar</li>
                      <li>Configure field properties and validation rules</li>
                      <li>Preview your form before publishing</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-500" />
                      Form Builder Overview
                    </h4>
                    <p className="text-muted-foreground">
                      The Form Builder is divided into three main areas: the toolbar (left), the canvas (center), and the properties panel (right). Simply drag components from the toolbar to the canvas and configure them using the properties panel.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Form Fields */}
            <AccordionItem value="form-fields" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Available Form Fields
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="font-semibold">Text Fields</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Text Input</Badge>
                        <span className="text-muted-foreground">Single line text</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Textarea</Badge>
                        <span className="text-muted-foreground">Multi-line text</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Email</Badge>
                        <span className="text-muted-foreground">Email validation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Phone</Badge>
                        <span className="text-muted-foreground">Phone number</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Selection Fields</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Dropdown</Badge>
                        <span className="text-muted-foreground">Single selection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Radio</Badge>
                        <span className="text-muted-foreground">Single choice</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Checkbox</Badge>
                        <span className="text-muted-foreground">Multiple choice</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Switch</Badge>
                        <span className="text-muted-foreground">Yes/No toggle</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Date & Time</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Date Picker</Badge>
                        <span className="text-muted-foreground">Date selection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Time Picker</Badge>
                        <span className="text-muted-foreground">Time selection</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold">Special Fields</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Photo Upload</Badge>
                        <span className="text-muted-foreground">Image capture</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Signature</Badge>
                        <span className="text-muted-foreground">Digital signature</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Number</Badge>
                        <span className="text-muted-foreground">Numeric input</span>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Form Management */}
            <AccordionItem value="form-management" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Form Management
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Share className="h-4 w-4 text-primary" />
                      Publishing & Sharing
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      Once your form is ready, you can publish it and share it in multiple ways:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Generate a QR code for easy mobile access</li>
                      <li>Copy the direct link to share via email or messaging</li>
                      <li>Embed the form on your website</li>
                      <li>Send via SMS or other communication channels</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      Due Dates & Scheduling
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      Set due dates for your forms to ensure timely completion:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>One-time due dates for single completion</li>
                      <li>Recurring schedules (daily, weekly, monthly)</li>
                      <li>Automatic reminders and notifications</li>
                      <li>Grace periods for late submissions</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      Form Status Management
                    </h4>
                    <p className="text-muted-foreground">
                      Forms can have different statuses: Draft (still being edited), Published (live and accepting responses), or Archived (no longer accepting responses but data is preserved).
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Responses & Analytics */}
            <AccordionItem value="responses-analytics" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Responses & Analytics
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Viewing Responses
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      Access all form responses in the Responses tab:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>View individual responses with full details</li>
                      <li>Filter responses by date, status, or content</li>
                      <li>Search through response data</li>
                      <li>Sort responses by submission date or other criteria</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Download className="h-4 w-4 text-green-500" />
                      Exporting Data
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      Export your form data in various formats:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>CSV format for spreadsheet analysis</li>
                      <li>PDF reports with formatted data</li>
                      <li>Individual response exports</li>
                      <li>Bulk data downloads</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-purple-500" />
                      Analytics Dashboard
                    </h4>
                    <p className="text-muted-foreground">
                      The Overview tab provides insights into your form performance including submission rates, completion times, popular fields, and trends over time.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Advanced Features */}
            <AccordionItem value="advanced-features" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Advanced Features
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-primary" />
                      QR Code Integration
                    </h4>
                    <p className="text-muted-foreground mb-3">
                      Every form automatically generates a QR code that can be:
                    </p>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Downloaded as PNG or SVG for printing</li>
                      <li>Customized with your branding colors</li>
                      <li>Embedded in documents or presentations</li>
                      <li>Displayed on screens or kiosks</li>
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Conditional Logic (Coming Soon)
                    </h4>
                    <p className="text-muted-foreground">
                      Create dynamic forms that show or hide fields based on user responses. Set up branching logic to create personalized form experiences.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Team Collaboration (Pro Feature)
                    </h4>
                    <p className="text-muted-foreground">
                      Upgrade to Pro to collaborate with team members, assign permissions, and manage forms together across your organization.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Tips & Best Practices */}
            <AccordionItem value="tips-best-practices" className="border rounded-lg px-4">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Tips & Best Practices
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="p-4 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">✓ Do</h4>
                      <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        <li>• Use clear, descriptive field labels</li>
                        <li>• Group related fields together</li>
                        <li>• Test your form before publishing</li>
                        <li>• Set appropriate field validation</li>
                        <li>• Use help text for complex fields</li>
                      </ul>
                    </Card>
                    
                    <Card className="p-4 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
                      <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">✗ Avoid</h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        <li>• Making forms too long</li>
                        <li>• Using technical jargon</li>
                        <li>• Requiring unnecessary information</li>
                        <li>• Forgetting to set due dates</li>
                        <li>• Not testing on mobile devices</li>
                      </ul>
                    </Card>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Mobile Optimization</h4>
                    <p className="text-muted-foreground">
                      All forms are automatically mobile-responsive, but consider the mobile experience when designing your forms. Use larger touch targets, minimize typing where possible, and test on various screen sizes.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* Quick Reference Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Plus className="h-4 w-4 text-primary" />
                <span className="text-sm">Create New Form</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm">View All Forms</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">Check Responses</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm">View Analytics</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Can't find what you're looking for? Contact our support team for assistance.
              </p>
              <div className="flex items-center gap-2 text-sm text-primary">
                <Info className="h-4 w-4" />
                <span>support@formbuilder.com</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};