
import React from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { QrCode, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface QrCodeDownloaderProps {
  formId: string;
  formTitle: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

export const QrCodeDownloader: React.FC<QrCodeDownloaderProps> = ({
  formId,
  formTitle,
  variant = 'ghost',
  size = 'sm',
  showIcon = true,
  showText = false,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const formUrl = `${window.location.origin}/form/${formId}`;

  const generateQrCode = async () => {
    setIsGenerating(true);
    try {
      const dataUrl = await QRCode.toDataURL(formUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQrCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `${formTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "QR code downloaded successfully",
    });
  };

  const copyFormLink = () => {
    navigator.clipboard.writeText(formUrl);
    toast({
      title: "Success",
      description: "Form link copied to clipboard",
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          onClick={generateQrCode}
          disabled={isGenerating}
        >
          {showIcon && <QrCode className="h-4 w-4" />}
          {showText && <span className={showIcon ? "ml-2" : ""}>QR Code</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code for "{formTitle}"</DialogTitle>
          <DialogDescription>
            Scan this QR code to access the form directly, or download it to share with others.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isGenerating ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : qrCodeDataUrl ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border">
                <img 
                  src={qrCodeDataUrl} 
                  alt={`QR Code for ${formTitle}`}
                  className="w-48 h-48"
                />
              </div>
              
              <div className="flex space-x-2 w-full">
                <Button 
                  onClick={downloadQrCode}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
                <Button 
                  variant="outline"
                  onClick={copyFormLink}
                  className="flex-1"
                >
                  Copy Link
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                Form URL: {formUrl}
              </p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
