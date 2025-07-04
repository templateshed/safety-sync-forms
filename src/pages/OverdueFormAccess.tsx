import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { PublicFormViewer } from '@/components/public/PublicFormViewer';
import { toast } from '@/hooks/use-toast';

interface AccessCodeData {
  form_id: string;
  form_title: string;
  form_description: string | null;
  access_code_valid: boolean;
}

export const OverdueFormAccess: React.FC = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const navigate = useNavigate();
  const [accessCodeData, setAccessCodeData] = useState<AccessCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    if (accessCode) {
      validateAccessCode();
    } else {
      setError('Invalid access code');
      setLoading(false);
    }
  }, [accessCode]);

  const validateAccessCode = async () => {
    try {
      const { data, error } = await supabase.rpc('get_form_by_access_code', {
        code: accessCode
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setError('Access code not found or invalid');
        return;
      }

      const codeData = data[0];
      
      if (!codeData.access_code_valid) {
        setError('Access code has expired or has already been used');
        return;
      }

      setAccessCodeData(codeData);
    } catch (error) {
      console.error('Error validating access code:', error);
      setError('Failed to validate access code');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmission = async () => {
    try {
      // Mark the access code as used
      const { data, error } = await supabase.rpc('mark_access_code_used', {
        code: accessCode
      });

      if (error) throw error;

      if (data) {
        setFormSubmitted(true);
        toast({
          title: "Form Submitted Successfully",
          description: "Your overdue form has been submitted and the access code has been marked as used.",
        });
      }
    } catch (error) {
      console.error('Error marking access code as used:', error);
      toast({
        title: "Warning",
        description: "Form submitted but there was an issue updating the access code status.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating access code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4 text-gray-900">Access Denied</h1>
              <p className="text-gray-600 mb-6">{error}</p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Check that you have the correct access code</p>
                <p>• Ensure the code hasn't expired (codes are valid for 48 hours)</p>
                <p>• Verify the code hasn't already been used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (formSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4 text-gray-900">Form Submitted</h1>
              <p className="text-gray-600 mb-6">
                Your overdue form has been successfully submitted. The access code has been marked as used and is no longer valid.
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Go to Homepage
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!accessCodeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No form data available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with overdue notice */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <Clock className="h-5 w-5 mr-2" />
              Overdue Form Access
            </CardTitle>
            <CardDescription className="text-orange-700">
              You are accessing an overdue form using access code: <code className="bg-orange-100 px-2 py-1 rounded font-mono">{accessCode}</code>
            </CardDescription>
          </CardHeader>
        </Card>

        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Important:</strong> This form is overdue. Once you submit this form, the access code will be marked as used and cannot be used again.
          </AlertDescription>
        </Alert>

        {/* Form content */}
        <div className="relative">
          <PublicFormViewer 
            formId={accessCodeData.form_id}
            onFormSubmitted={handleFormSubmission}
            isOverdueAccess={true}
          />
        </div>
      </div>
    </div>
  );
};

export default OverdueFormAccess;