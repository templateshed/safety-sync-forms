
import React from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { QrCode, Download } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatShortCodeForDisplay } from '@/utils/shortCode';
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
  shortCode?: string | null;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

export const QrCodeDownloader: React.FC<QrCodeDownloaderProps> = ({
  formId,
  formTitle,
  shortCode,
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
      // Generate the QR code first
      const qrDataUrl = await QRCode.toDataURL(formUrl, {
        width: 400,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Create a canvas to compose the final image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas dimensions
      const canvasWidth = 600;
      const titleHeight = 80;
      const qrSize = 400;
      const shortCodeHeight = shortCode ? 80 : 20;
      const padding = 40;
      
      canvas.width = canvasWidth;
      canvas.height = titleHeight + qrSize + shortCodeHeight + (padding * 3);

      // Fill background with white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw form title
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Word wrap for long titles
      const maxTitleWidth = canvasWidth - (padding * 2);
      const words = formTitle.split(' ');
      let line = '';
      let y = padding + 30;
      
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxTitleWidth && n > 0) {
          ctx.fillText(line, canvasWidth / 2, y);
          line = words[n] + ' ';
          y += 30;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvasWidth / 2, y);

      // Load and draw QR code
      const qrImage = new Image();
      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = reject;
        qrImage.src = qrDataUrl;
      });

      const qrX = (canvasWidth - qrSize) / 2;
      const qrY = titleHeight + padding;
      ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

      // Draw short code if available
      if (shortCode) {
        const shortCodeY = titleHeight + qrSize + padding * 2;
        
        // Draw "Quick Access Code" label
        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = '#666666';
        ctx.fillText('Quick Access Code', canvasWidth / 2, shortCodeY);
        
        // Draw the short code
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#000000';
        ctx.fillText(formatShortCodeForDisplay(shortCode), canvasWidth / 2, shortCodeY + 35);
      }

      // Convert canvas to data URL
      const compositeDataUrl = canvas.toDataURL('image/png', 1.0);
      setQrCodeDataUrl(compositeDataUrl);
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
              {/* Composite QR Code with embedded title and short code */}
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <img 
                  src={qrCodeDataUrl} 
                  alt={`QR Code for ${formTitle}`}
                  className="max-w-full h-auto"
                  style={{ maxHeight: '400px' }}
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
