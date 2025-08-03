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

interface FormResponseWithUserData {
  id: string;
  form_id: string;
  respondent_email: string | null;
  response_data: any;
  submitted_at: string;
  updated_at?: string;
  updated_by?: string;
  edit_history?: any[];
  respondent_user_id: string | null;
  form_title: string;
  first_name: string | null;
  last_name: string | null;
  effective_email: string | null;
  ip_address: unknown | null;
  user_agent: string | null;
  form_fields: any;
}

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

interface FormSignature {
  id: string;
  field_id: string;
  signature_data: string;
  signature_type: string;
  typed_name?: string;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  is_collapsible: boolean;
  is_collapsed: boolean;
}

interface ResponseExporterProps {
  responses: FormResponseWithUserData[];
  formFields: FormField[];
  sections: FormSection[];
  signatures: FormSignature[];
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

export const ResponseExporter: React.FC<ResponseExporterProps> = ({
  responses,
  formFields,
  sections,
  signatures,
  variant = 'outline',
  size = 'sm',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image' | 'json'>('pdf');
  const previewRef = useRef<HTMLDivElement>(null);

  const getRespondentEmail = (response: FormResponseWithUserData) => {
    if (response.effective_email) {
      return response.effective_email;
    }
    return 'Anonymous';
  };

  const getRespondentName = (response: FormResponseWithUserData) => {
    if (response.first_name && response.last_name) {
      return `${response.first_name} ${response.last_name}`;
    } else if (response.first_name) {
      return response.first_name;
    } else if (response.last_name) {
      return response.last_name;
    }
    return 'Anonymous';
  };

  const groupFieldsBySection = (fields: FormField[]) => {
    const grouped: { [sectionId: string]: FormField[] } = {};
    const unsectioned: FormField[] = [];

    fields.forEach(field => {
      if (field.section_id) {
        if (!grouped[field.section_id]) {
          grouped[field.section_id] = [];
        }
        grouped[field.section_id].push(field);
      } else {
        unsectioned.push(field);
      }
    });

    return { grouped, unsectioned };
  };

  const generateResponseHTML = (response: FormResponseWithUserData) => {
    const responseSignatures = signatures.filter(sig => sig.field_id && response.response_data[sig.field_id]);
    const responseFields = formFields.filter(field => field.id in (response.response_data || {}));
    const { grouped, unsectioned } = groupFieldsBySection(responseFields);

    let htmlContent = `
      <div style="min-height: 600px; background: white; padding: 32px; font-family: Arial, sans-serif;">
        <!-- Response Header -->
        <div style="margin-bottom: 32px; border-bottom: 1px solid #ccc; padding-bottom: 24px;">
          <h1 style="font-size: 24px; font-weight: bold; color: #111; margin-bottom: 8px;">${response.form_title}</h1>
          <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
            <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Response ID: ${response.id.slice(0, 8)}...</span>
            <span style="background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Submitted: ${new Date(response.submitted_at).toLocaleDateString()}</span>
            ${response.updated_at && response.updated_at !== response.submitted_at ? 
              '<span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Modified</span>' : ''}
          </div>
          <div style="margin-top: 16px;">
            <p style="font-size: 14px; color: #666; margin: 4px 0;"><strong>Respondent:</strong> ${getRespondentName(response)}</p>
            <p style="font-size: 14px; color: #666; margin: 4px 0;"><strong>Email:</strong> ${getRespondentEmail(response)}</p>
            <p style="font-size: 14px; color: #666; margin: 4px 0;"><strong>Submitted:</strong> ${new Date(response.submitted_at).toLocaleString()}</p>
          </div>
        </div>
        
        <!-- Response Content -->
        <div style="margin-bottom: 32px;">`;

    // Add unsectioned fields first
    if (unsectioned.length > 0) {
      htmlContent += `<div style="margin-bottom: 24px;">`;
      unsectioned.forEach(field => {
        const fieldId = field.id;
        const value = response.response_data[fieldId];
        const fieldLabel = response.form_fields && response.form_fields[fieldId] 
          ? response.form_fields[fieldId] 
          : fieldId;

        if (!response.form_fields || !response.form_fields[fieldId]) {
          return;
        }

        const signature = responseSignatures.find(sig => sig.field_id === fieldId);
        
        htmlContent += `
          <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; background: #f9fafb; margin-bottom: 16px;">
            <div style="margin-bottom: 8px;">
              <span style="font-size: 16px; font-weight: 600; color: #111;">${fieldLabel}</span>
              <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-left: 8px;">${field.field_type}</span>
            </div>
            <div style="margin-top: 12px;">`;

         if (field.field_type === 'signature' && signature) {
           htmlContent += `
             <div>
               <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                 <span style="font-size: 12px; color: #666;">Signature (${signature.signature_type})</span>
                 ${signature.typed_name ? `<span style="font-size: 12px; color: #666;">Name: ${signature.typed_name}</span>` : ''}
               </div>
               <img src="${signature.signature_data}" alt="Signature for ${fieldLabel}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; background: white; max-height: 120px;" />
             </div>`;
         } else if (field.field_type === 'photo') {
           const photoUrls = Array.isArray(value) ? value : (value ? [value] : []);
           if (photoUrls.length > 0) {
             htmlContent += `
               <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
                 ${photoUrls.map((url: string, index: number) => `
                   <img src="${url}" alt="Photo ${index + 1} for ${fieldLabel}" style="width: 100%; height: 120px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                 `).join('')}
               </div>`;
           } else {
             htmlContent += `<div style="background: white; border: 1px solid #ddd; border-radius: 4px; padding: 12px; color: #666;">No photos uploaded</div>`;
           }
         } else {
           htmlContent += `
             <div style="background: white; border: 1px solid #ddd; border-radius: 4px; padding: 12px; min-height: 40px; display: flex; align-items: center;">
               <span style="color: #111;">${String(value)}</span>
             </div>`;
         }

        htmlContent += `</div></div>`;
      });
      htmlContent += `</div>`;
    }

    // Add sectioned fields
    sections.forEach(section => {
      const sectionFields = grouped[section.id] || [];
      if (sectionFields.length === 0) return;

      htmlContent += `
        <div style="border: 2px solid #ccc; border-radius: 8px; padding: 24px; background: #f5f5f5; margin-bottom: 24px;">
          <div style="margin-bottom: 16px; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
            <h2 style="font-size: 20px; font-weight: bold; color: #111; margin: 0;">${section.title}</h2>
            ${section.description ? `<p style="color: #666; margin: 4px 0 0 0;">${section.description}</p>` : ''}
          </div>
          <div>`;

      sectionFields.forEach(field => {
        const fieldId = field.id;
        const value = response.response_data[fieldId];
        const fieldLabel = response.form_fields && response.form_fields[fieldId] 
          ? response.form_fields[fieldId] 
          : fieldId;

        if (!response.form_fields || !response.form_fields[fieldId]) {
          return;
        }

        const signature = responseSignatures.find(sig => sig.field_id === fieldId);
        
        htmlContent += `
          <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; background: white; margin-bottom: 16px;">
            <div style="margin-bottom: 8px;">
              <span style="font-size: 16px; font-weight: 600; color: #111;">${fieldLabel}</span>
              <span style="background: #f3f4f6; color: #374151; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-left: 8px;">${field.field_type}</span>
            </div>
            <div style="margin-top: 12px;">`;

        if (field.field_type === 'signature' && signature) {
          htmlContent += `
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 12px; color: #666;">Signature (${signature.signature_type})</span>
                ${signature.typed_name ? `<span style="font-size: 12px; color: #666;">Name: ${signature.typed_name}</span>` : ''}
              </div>
              <img src="${signature.signature_data}" alt="Signature for ${fieldLabel}" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; background: white; max-height: 120px;" />
            </div>`;
        } else if (field.field_type === 'photo') {
          const photoUrls = Array.isArray(value) ? value : (value ? [value] : []);
          if (photoUrls.length > 0) {
            htmlContent += `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
                ${photoUrls.map((url: string, index: number) => `
                  <img src="${url}" alt="Photo ${index + 1} for ${fieldLabel}" style="width: 100%; height: 120px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" />
                `).join('')}
              </div>`;
          } else {
            htmlContent += `<div style="background: #f9fafb; border: 1px solid #ddd; border-radius: 4px; padding: 12px; color: #666;">No photos uploaded</div>`;
          }
        } else {
          htmlContent += `
            <div style="background: #f9fafb; border: 1px solid #ddd; border-radius: 4px; padding: 12px; min-height: 40px; display: flex; align-items: center;">
              <span style="color: #111;">${String(value)}</span>
            </div>`;
        }

        htmlContent += `</div></div>`;
      });

      htmlContent += `</div></div>`;
    });

    if ((!response.response_data || Object.keys(response.response_data).length === 0) && unsectioned.length === 0) {
      htmlContent += `
        <div style="text-align: center; padding: 48px; color: #666;">
          <p style="font-size: 18px;">No response data available.</p>
        </div>`;
    }

    htmlContent += `
        </div>
        
        <!-- Response Footer -->
        <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #ccc; font-size: 14px; color: #666;">
          <p style="margin: 4px 0;">Response ID: ${response.id}</p>
          <p style="margin: 4px 0;">Exported on: ${new Date().toLocaleString()}</p>
        </div>
      </div>`;

    return htmlContent;
  };

  const renderResponsePreview = (response: FormResponseWithUserData, index: number) => {
    const responseSignatures = signatures.filter(sig => sig.field_id && response.response_data[sig.field_id]);
    const responseFields = formFields.filter(field => field.id in (response.response_data || {}));
    const { grouped, unsectioned } = groupFieldsBySection(responseFields);

    return (
      <div key={response.id} className={`bg-white p-8 min-h-[600px] ${index > 0 ? 'page-break-before' : ''}`}>
        {/* Response Header */}
        <div className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{response.form_title}</h1>
          <div className="flex gap-2 mt-4">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Response ID: {response.id.slice(0, 8)}...
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Submitted: {new Date(response.submitted_at).toLocaleDateString()}
            </Badge>
            {response.updated_at && response.updated_at !== response.submitted_at && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Modified
              </Badge>
            )}
          </div>
          
          <div className="mt-4 space-y-1">
            <p className="text-sm text-gray-600">
              <strong>Respondent:</strong> {getRespondentName(response)}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {getRespondentEmail(response)}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Submitted:</strong> {new Date(response.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Response Content */}
        <div className="space-y-6">
          {/* Unsectioned fields */}
          {unsectioned.length > 0 && (
            <div className="space-y-4">
              {unsectioned.map(field => {
                const fieldId = field.id;
                const value = response.response_data[fieldId];
                const fieldLabel = response.form_fields && response.form_fields[fieldId] 
                  ? response.form_fields[fieldId] 
                  : fieldId;

                if (!response.form_fields || !response.form_fields[fieldId]) {
                  return null;
                }

                const signature = responseSignatures.find(sig => sig.field_id === fieldId);

                return (
                  <div key={fieldId} className="border rounded-lg p-4 bg-gray-50">
                    <div className="mb-2">
                      <Label className="text-base font-medium text-gray-800">
                        {fieldLabel}
                      </Label>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {field.field_type}
                      </Badge>
                    </div>
                    
                    <div className="mt-3">
                      {field.field_type === 'signature' && signature ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              Signature ({signature.signature_type})
                            </span>
                            {signature.typed_name && (
                              <span className="text-xs text-gray-600">
                                Name: {signature.typed_name}
                              </span>
                            )}
                          </div>
                          <img 
                            src={signature.signature_data} 
                            alt={`Signature for ${fieldLabel}`}
                            className="max-w-full h-auto border rounded bg-white"
                            style={{ maxHeight: '120px' }}
                          />
                        </div>
                      ) : field.field_type === 'photo' ? (
                        (() => {
                          const photoUrls = Array.isArray(value) ? value : (value ? [value] : []);
                          if (photoUrls.length > 0) {
                            return (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {photoUrls.map((url: string, index: number) => (
                                  <img
                                    key={index}
                                    src={url}
                                    alt={`Photo ${index + 1} for ${fieldLabel}`}
                                    className="w-full h-20 object-cover rounded border"
                                  />
                                ))}
                              </div>
                            );
                          } else {
                            return (
                              <div className="bg-white border rounded px-3 py-2 min-h-[40px] flex items-center text-gray-500">
                                No photos uploaded
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <div className="bg-white border rounded px-3 py-2 min-h-[40px] flex items-center">
                          <span className="text-gray-900">{String(value)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sectioned fields */}
          {sections.map(section => {
            const sectionFields = grouped[section.id] || [];
            if (sectionFields.length === 0) return null;

            return (
              <div key={section.id} className="border-2 border-gray-300 rounded-lg p-6 bg-gray-100">
                <div className="mb-4 border-b border-gray-300 pb-2">
                  <h2 className="text-xl font-semibold text-gray-800">{section.title}</h2>
                  {section.description && (
                    <p className="text-gray-600 mt-1">{section.description}</p>
                  )}
                </div>
                
                <div className="space-y-4">
                  {sectionFields.map(field => {
                    const fieldId = field.id;
                    const value = response.response_data[fieldId];
                    const fieldLabel = response.form_fields && response.form_fields[fieldId] 
                      ? response.form_fields[fieldId] 
                      : fieldId;

                    if (!response.form_fields || !response.form_fields[fieldId]) {
                      return null;
                    }

                    const signature = responseSignatures.find(sig => sig.field_id === fieldId);

                    return (
                      <div key={fieldId} className="border rounded-lg p-4 bg-white">
                        <div className="mb-2">
                          <Label className="text-base font-medium text-gray-800">
                            {fieldLabel}
                          </Label>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {field.field_type}
                          </Badge>
                        </div>
                        
                        <div className="mt-3">
                          {field.field_type === 'signature' && signature ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">
                                  Signature ({signature.signature_type})
                                </span>
                                {signature.typed_name && (
                                  <span className="text-xs text-gray-600">
                                    Name: {signature.typed_name}
                                  </span>
                                )}
                              </div>
                              <img 
                                src={signature.signature_data} 
                                alt={`Signature for ${fieldLabel}`}
                                className="max-w-full h-auto border rounded bg-white"
                                style={{ maxHeight: '120px' }}
                              />
                            </div>
                          ) : field.field_type === 'photo' ? (
                            (() => {
                              const photoUrls = Array.isArray(value) ? value : (value ? [value] : []);
                              if (photoUrls.length > 0) {
                                return (
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {photoUrls.map((url: string, index: number) => (
                                      <img
                                        key={index}
                                        src={url}
                                        alt={`Photo ${index + 1} for ${fieldLabel}`}
                                        className="w-full h-20 object-cover rounded border"
                                      />
                                    ))}
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="bg-gray-50 border rounded px-3 py-2 min-h-[40px] flex items-center text-gray-500">
                                    No photos uploaded
                                  </div>
                                );
                              }
                            })()
                          ) : (
                            <div className="bg-gray-50 border rounded px-3 py-2 min-h-[40px] flex items-center">
                              <span className="text-gray-900">{String(value)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {response.response_data && typeof response.response_data === 'object' && Object.keys(response.response_data).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No response data available.</p>
            </div>
          )}
        </div>

        {/* Response Footer */}
        <div className="mt-12 pt-6 border-t text-sm text-gray-500">
          <p>Response ID: {response.id}</p>
          <p>Exported on: {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  };

  const renderAllResponsesPreview = () => {
    return (
      <div ref={previewRef} className="space-y-8">
        {responses.map((response, index) => renderResponsePreview(response, index))}
      </div>
    );
  };

  const exportAsPDF = async () => {
    if (!previewRef.current) return;

    try {
      setIsExporting(true);
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        // Create a temporary container for single response
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '800px';
        tempContainer.style.background = 'white';
        tempContainer.style.padding = '32px';
        tempContainer.style.fontFamily = 'Arial, sans-serif';
        
        // Build the HTML content using the helper function
        const htmlContent = generateResponseHTML(response);

        tempContainer.innerHTML = htmlContent;
        document.body.appendChild(tempContainer);

        // Create canvas from the temporary container
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
        });

        // Clean up
        document.body.removeChild(tempContainer);

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
        
        // Generate filename with form name and submission date
        const submissionDate = new Date(response.submitted_at).toISOString().split('T')[0];
        const cleanFormTitle = response.form_title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const fileName = `${cleanFormTitle}_${submissionDate}.pdf`;
        pdf.save(fileName);
      }

      toast({
        title: "Success",
        description: `${responses.length} response(s) exported as PDF successfully`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Error",
        description: "Failed to export responses as PDF",
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
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        // Create a temporary container for single response
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '800px';
        tempContainer.style.background = 'white';
        tempContainer.style.padding = '32px';
        tempContainer.style.fontFamily = 'Arial, sans-serif';
        
        // Build the HTML content using the helper function
        const htmlContent = generateResponseHTML(response);

        tempContainer.innerHTML = htmlContent;
        document.body.appendChild(tempContainer);

        // Create canvas from the temporary container
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
        });

        // Clean up
        document.body.removeChild(tempContainer);

        const link = document.createElement('a');
        // Generate filename with form name and submission date
        const submissionDate = new Date(response.submitted_at).toISOString().split('T')[0];
        const cleanFormTitle = response.form_title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const fileName = `${cleanFormTitle}_${submissionDate}.png`;
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }

      toast({
        title: "Success",
        description: `${responses.length} response(s) exported as images successfully`,
      });
    } catch (error) {
      console.error('Error exporting images:', error);
      toast({
        title: "Error",
        description: "Failed to export responses as images",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsJSON = () => {
    try {
      setIsExporting(true);
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const responseSignatures = signatures.filter(sig => sig.field_id && response.response_data[sig.field_id]);
        
        const exportData = {
          response: {
            id: response.id,
            form_id: response.form_id,
            form_title: response.form_title,
            respondent: {
              name: getRespondentName(response),
              email: getRespondentEmail(response),
              user_id: response.respondent_user_id,
            },
            submitted_at: response.submitted_at,
            updated_at: response.updated_at,
            updated_by: response.updated_by,
            response_data: response.response_data,
            edit_history: response.edit_history,
          },
          signatures: responseSignatures,
          form_fields: response.form_fields,
          exported_at: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Generate filename with form name and submission date
        const submissionDate = new Date(response.submitted_at).toISOString().split('T')[0];
        const cleanFormTitle = response.form_title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        const fileName = `${cleanFormTitle}_${submissionDate}.json`;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Success",
        description: `${responses.length} response(s) exported as JSON successfully`,
      });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast({
        title: "Error",
        description: "Failed to export responses as JSON",
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} disabled={responses.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export ({responses.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Export Responses ({responses.length})</DialogTitle>
          <DialogDescription>
            Choose your preferred export format. Each response will be exported as a separate file.
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
                        Export {responses.length} {exportFormat.toUpperCase()}
                      </div>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>PDF:</strong> Professional document format</p>
                  <p><strong>PNG:</strong> High-quality image format</p>
                  <p><strong>JSON:</strong> Data format for import/backup</p>
                  <p className="text-amber-600 mt-2">
                    <strong>Note:</strong> Each response will be exported as a separate file.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="flex-1 border rounded-lg overflow-auto bg-gray-50">
            <div className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Preview ({responses.length} responses)</h3>
              {renderAllResponsesPreview()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};