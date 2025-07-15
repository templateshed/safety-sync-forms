import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, Type, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { parseFormIdentifier, formatShortCodeForDisplay } from '@/utils/shortCode';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

export const QRScanner: React.FC = () => {
  const [manualFormId, setManualFormId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(true);
  const [scanProgress, setScanProgress] = useState('');
  const [detectedCode, setDetectedCode] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if camera is available with more detailed error handling
    const checkCamera = async () => {
      try {
        console.log('Checking camera availability...');
        const stream = await navigator.mediaDevices?.getUserMedia({ video: true });
        console.log('Camera access granted');
        setHasCamera(true);
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Camera access error:', error);
        setHasCamera(false);
        
        // Set specific error message based on error type
        if (error.name === 'NotAllowedError') {
          setScanProgress('Camera access denied by user');
        } else if (error.name === 'NotFoundError') {
          setScanProgress('No camera found on device');
        } else if (error.name === 'NotReadableError') {
          setScanProgress('Camera is being used by another application');
        } else {
          setScanProgress(`Camera error: ${error.message}`);
        }
      }
    };

    checkCamera();

    return () => {
      // Cleanup scanner and timeout on unmount
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const handleQRScanSuccess = (decodedText: string) => {
    console.log('QR Code scanned:', decodedText);
    setDetectedCode(decodedText);
    setScanProgress('QR Code detected! Processing...');
    
    // Clear timeout since we found a code
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Stop scanning
    stopScanning();
    
    // Check if the scanned text is a URL containing our form
    let formIdentifier = decodedText;
    
    // If it's a URL, extract the form identifier from it
    if (decodedText.includes('/form/')) {
      const urlParts = decodedText.split('/form/');
      if (urlParts.length > 1) {
        formIdentifier = urlParts[1].split(/[?#]/)[0]; // Remove query params and fragments
      }
    }
    
    // Validate the form identifier
    const identifier = parseFormIdentifier(formIdentifier);
    
    if (identifier.type === 'invalid') {
      toast({
        title: "Invalid QR Code",
        description: "This QR code doesn't contain a valid form identifier",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "QR Code Scanned!",
      description: `Opening form: ${formIdentifier}`,
    });

    // Navigate to the form
    navigate(`/form/${formIdentifier}`);
  };

  const handleQRScanError = (error: string) => {
    // Update scan progress to show we're actively scanning
    if (isScanning) {
      setScanProgress('Scanning for QR codes...');
    }
    
    // Only log errors that aren't just "No QR code found" (which happens continuously)
    if (!error.includes('No MultiFormat Readers') && !error.includes('NotFoundException')) {
      console.warn('QR scan error:', error);
    }
  };

  const startScanning = () => {
    console.log('Start scanning button clicked!');
    console.log('hasCamera:', hasCamera);
    
    if (!hasCamera) {
      toast({
        title: "Camera Not Available",
        description: "Your device doesn't have a camera or camera access is denied",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting QR scanner...');
    setScanProgress('Initializing camera...');
    setDetectedCode('');

    if (scannerContainerRef.current) {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-scanner-container",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
          },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            console.log('QR Code detected:', decodedText);
            setScanProgress('QR Code found!');
            handleQRScanSuccess(decodedText);
          }, 
          (error) => {
            handleQRScanError(error);
          }
        );

        // Set scanning state and timeout after scanner is created
        setIsScanning(true);
        
        // Set a timeout to automatically stop scanning after 30 seconds
        scanTimeoutRef.current = setTimeout(() => {
          setScanProgress('Scan timeout - camera stopped');
          stopScanning();
          toast({
            title: "Scan Timeout",
            description: "Camera stopped automatically after 30 seconds of scanning",
            variant: "default",
          });
        }, 30000);

        // Update progress once scanner starts
        setTimeout(() => {
          setScanProgress('Camera active - point at QR code to scan');
        }, 2000);

      } catch (error) {
        console.error('Failed to start scanner:', error);
        setScanProgress('Failed to start camera');
        toast({
          title: "Scanner Error",
          description: "Failed to initialize the QR code scanner",
          variant: "destructive",
        });
        setIsScanning(false);
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setIsScanning(false);
    setScanProgress('');
    setDetectedCode('');
  };

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
              {!hasCamera && (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning ? (
              <div className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-lg">
                <Camera className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {hasCamera 
                    ? "Click the button below to start scanning QR codes with your camera"
                    : "Camera not available on this device"
                  }
                </p>
                <Button 
                  onClick={startScanning}
                  disabled={!hasCamera}
                  className="brand-gradient text-white border-0"
                >
                  Start QR Scanner
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Camera Active</h4>
                  <Button 
                    onClick={stopScanning}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Stop Scanning
                  </Button>
                </div>
                
                {/* Scanner Preview */}
                <div className="space-y-2">
                  {scanProgress && (
                    <div className="bg-muted/50 border rounded-lg p-3">
                      <p className="text-sm font-medium text-center">{scanProgress}</p>
                    </div>
                  )}
                  
                  {detectedCode && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Detected Code:</p>
                      <p className="text-sm font-mono break-all">{detectedCode}</p>
                    </div>
                  )}
                </div>

                <div 
                  id="qr-scanner-container" 
                  ref={scannerContainerRef}
                  className="w-full"
                />
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Point your camera at a form QR code to scan it automatically
                  </p>
                  <p className="text-xs text-muted-foreground/75">
                    Camera will automatically stop after 30 seconds
                  </p>
                </div>
              </div>
            )}
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
                <li>• Click "Start QR Scanner" to activate your camera</li>
                <li>• Allow camera permissions when prompted</li>
                <li>• Point your camera at the form's QR code</li>
                <li>• The form will open automatically when detected</li>
                <li>• Use the torch/flashlight button in low light</li>
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
          
          {!hasCamera && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p className="text-sm font-medium">Camera Not Available</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                QR scanning requires camera access. Please use manual form ID entry instead, or try using a device with a camera.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};