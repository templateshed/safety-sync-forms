import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { parseFormIdentifier, formatShortCodeForDisplay } from '@/utils/shortCode';

export const QRScanner: React.FC = () => {
  const [manualFormId, setManualFormId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFormId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a form ID or code",
        variant: "destructive",
      });
      return;
    }

    const trimmedInput = manualFormId.trim();
    const identifier = parseFormIdentifier(trimmedInput);
    
    if (identifier.type === 'invalid') {
      toast({
        title: "Invalid Format",
        description: "Please enter a valid form code (e.g., ABC123) or form ID",
        variant: "destructive",
      });
      return;
    }

    // Navigate to the public form using the trimmed input
    navigate(`/form/${trimmedInput}`);
  };

  const handleScanQR = () => {
    setIsScanning(true);
    // In a real implementation, this would open the camera and scan QR codes
    // For now, we'll show a placeholder message
    toast({
      title: "QR Scanner",
      description: "QR scanning feature coming soon! Use manual form ID input for now.",
    });
    setIsScanning(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan Form QR Code</h1>
        <p className="text-muted-foreground">
          Access forms by scanning their QR code or entering the form ID manually.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <Camera className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground text-center mb-4">
                Click the button below to start scanning QR codes
              </p>
              <Button 
                onClick={handleScanQR}
                disabled={isScanning}
                className="brand-gradient text-white border-0"
              >
                {isScanning ? 'Scanning...' : 'Start QR Scanner'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Entry Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Manual Form ID Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="formId">Form Code or ID</Label>
                <Input
                  id="formId"
                  type="text"
                  placeholder="Enter form code (e.g., ABC123 or ABC-123)"
                  value={manualFormId}
                  onChange={(e) => setManualFormId(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Enter the short form code (like <code className="bg-muted px-1 rounded">ABC123</code>) or the full form ID provided by the form creator.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Form codes are 6-8 characters long and make forms easier to access.
                  </p>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                variant="outline"
              >
                Access Form
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Access Forms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Using QR Scanner</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Click "Start QR Scanner" to open the camera</li>
                <li>• Point your camera at the form's QR code</li>
                <li>• The form will open automatically when detected</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Using Manual Entry</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Get the short form code (e.g., <code className="bg-muted px-1 rounded text-xs">ABC123</code>) from the form creator</li>
                <li>• Enter the code in the text field (hyphens are optional)</li>
                <li>• Form codes are much easier to type than full IDs</li>
                <li>• Click "Access Form" to open the form</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};