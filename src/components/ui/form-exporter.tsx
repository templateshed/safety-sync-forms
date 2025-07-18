import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileImage, FileText, File, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FormField {
  id: string;
  field_type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: any;
  order_index: number;
  section_id?: string;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

interface FormData {
  id: string;
  title: string;
  description?: string;
  status: string;
  schedule_type?: string;
  schedule_start_date?: string;
  schedule_end_date?: string;
  schedule_time?: string;
  business_days_only?: boolean;
  business_days?: number[];
}

interface FormExporterProps {
  form: FormData;
  fields: FormField[];
  sections: FormSection[];
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export const FormExporter: React.FC<FormExporterProps> = ({
  form,
  fields,
  sections,
  variant = 'outline',
  size = 'sm',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image' | 'json'>('pdf');
  const previewRef = useRef<HTMLDivElement>(null);

  const renderFormPreview = () => {
    const sortedFields = [...fields].sort((a, b) => a.order_index - b.order_index);
    const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

    return (
      <div ref={previewRef} className="bg-white p-8 min-h-[600px]">
        {/* Form Header */}
        <div className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{form.title}</h1>
          {form.description && (
            <p className="text-gray-600 text-lg">{form.description}</p>
          )}
          <div className="flex gap-2 mt-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Status: {form.status}
            </Badge>
            {form.schedule_type && form.schedule_type !== 'one_time' && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Schedule: {form.schedule_type}
              </Badge>
            )}
            {form.business_days_only && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                Business Days Only
              </Badge>
            )}
          </div>
          
          {form.schedule_time && (
            <p className="text-sm text-gray-500 mt-2">
              Due time: {form.schedule_time}
            </p>
          )}
        </div>

        {/* Form Content */}
        <div className="space-y-8">
          {sortedSections.length > 0 ? (
            // Render sections with their fields
            sortedSections.map((section) => {
              const sectionFields = sortedFields.filter(field => field.section_id === section.id);
              
              return (
                <div key={section.id} className="border rounded-lg p-6 bg-gray-50">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
                    {section.description && (
                      <p className="text-gray-600 mt-1">{section.description}</p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {sectionFields.map((field) => (
                      <FormFieldPreview key={field.id} field={field} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Render fields without sections
            <div className="space-y-6">
              {sortedFields.map((field) => (
                <FormFieldPreview key={field.id} field={field} />
              ))}
            </div>
          )}

          {sortedFields.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">This form has no fields configured.</p>
            </div>
          )}
        </div>

        {/* Form Footer */}
        <div className="mt-12 pt-6 border-t text-sm text-gray-500">
          <p>Form ID: {form.id}</p>
          <p>Generated on: {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  };

  const FormFieldPreview: React.FC<{ field: FormField }> = ({ field }) => {
    return (
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Label className="text-base font-medium text-gray-800">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Badge variant="secondary" className="text-xs">
            {field.field_type}
          </Badge>
        </div>
        
        {field.placeholder && (
          <p className="text-sm text-gray-500 mb-2">Placeholder: {field.placeholder}</p>
        )}

        {/* Field Type Specific Preview */}
        <div className="mt-3">
          {field.field_type === 'select' || field.field_type === 'radio' || field.field_type === 'checkbox' ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">Options:</p>
              {field.options?.choices?.map((choice: string, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  {choice}
                </div>
              ))}
            </div>
          ) : field.field_type === 'textarea' ? (
            <div className="h-20 bg-gray-50 border rounded px-3 py-2 text-gray-400">
              Large text input area
            </div>
          ) : field.field_type === 'signature' ? (
            <div className="h-24 bg-gray-50 border-2 border-dashed rounded px-3 py-2 flex items-center justify-center text-gray-400">
              Signature Area
            </div>
          ) : field.field_type === 'date' ? (
            <div className="h-10 bg-gray-50 border rounded px-3 py-2 text-gray-400 flex items-center">
              Date picker
            </div>
          ) : (
            <div className="h-10 bg-gray-50 border rounded px-3 py-2 text-gray-400 flex items-center">
              {field.field_type === 'email' ? 'Email input' : 
               field.field_type === 'number' ? 'Number input' : 'Text input'}
            </div>
          )}
        </div>
      </div>
    );
  };

  const exportAsPDF = async () => {
    if (!previewRef.current) return;

    try {
      setIsExporting(true);
      
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_form.pdf`);

      toast({
        title: "Success",
        description: "Form exported as PDF successfully",
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export form as PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsImage = async () => {
    if (!previewRef.current) return;

    try {
      setIsExporting(true);
      
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_form.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Success",
        description: "Form exported as image successfully",
      });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast({
        title: "Error",
        description: "Failed to export form as image",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJSON = () => {
    try {
      setIsExporting(true);
      
      const exportData = {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          status: form.status,
          schedule_type: form.schedule_type,
          schedule_start_date: form.schedule_start_date,
          schedule_end_date: form.schedule_end_date,
          schedule_time: form.schedule_time,
          business_days_only: form.business_days_only,
          business_days: form.business_days,
        },
        sections: sections,
        fields: fields,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_form.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Form exported as JSON successfully",
      });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast({
        title: "Error",
        description: "Failed to export form as JSON",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    switch (exportFormat) {
      case 'pdf':
        exportAsPDF();
        break;
      case 'image':
        exportAsImage();
        break;
      case 'json':
        exportAsJSON();
        break;
      default:
        break;
    }
  };

  const printForm = () => {
    if (!previewRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>${form.title} - Form Preview</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .form-header { border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
            .form-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .form-description { color: #666; font-size: 16px; }
            .field { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .field-label { font-weight: bold; margin-bottom: 5px; }
            .field-type { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
            .required { color: red; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${previewRef.current.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} disabled={fields.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Export Form: "{form.title}"</DialogTitle>
          <DialogDescription>
            Choose your preferred export format and preview the form layout
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex gap-4 h-[600px]">
          {/* Export Controls */}
          <div className="w-64 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Export Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="format">Export Format</Label>
                  <Select value={exportFormat} onValueChange={(value: 'pdf' | 'image' | 'json') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          PDF Document
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <FileImage className="h-4 w-4" />
                          PNG Image
                        </div>
                      </SelectItem>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <File className="h-4 w-4" />
                          JSON Data
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Exporting...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export {exportFormat.toUpperCase()}
                      </div>
                    )}
                  </Button>

                  <Button 
                    onClick={printForm}
                    variant="outline"
                    className="w-full"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Form
                  </Button>
                </div>

                <Separator />

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>PDF:</strong> Professional document format</p>
                  <p><strong>PNG:</strong> High-quality image format</p>
                  <p><strong>JSON:</strong> Data format for import/backup</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Preview */}
          <div className="flex-1 border rounded-lg overflow-auto bg-gray-50">
            {renderFormPreview()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};