import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PhotoFieldProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  required?: boolean;
  placeholder?: string;
  multiple?: boolean;
}

export const PhotoField: React.FC<PhotoFieldProps> = ({
  value = [],
  onChange,
  required = false,
  placeholder = "Upload photos",
  multiple = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setCameraStream(stream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions or use file upload instead.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        await uploadFile(blob, `captured-${Date.now()}.jpg`);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    if (!multiple && fileArray.length > 1) {
      toast({
        title: "Single Photo Only",
        description: "This field only accepts one photo.",
        variant: "destructive",
      });
      return;
    }

    for (const file of fileArray) {
      await uploadFile(file, file.name);
    }
  };

  const uploadFile = async (file: File | Blob, fileName: string) => {
    setUploading(true);
    try {
      // Create a unique filename with timestamp
      const timestamp = Date.now();
      const fileExt = fileName.split('.').pop() || 'jpg';
      const uniqueFileName = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('form-photos')
        .upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('form-photos')
        .getPublicUrl(data.path);

      const newUrls = multiple ? [...value, urlData.publicUrl] : [urlData.publicUrl];
      onChange(newUrls);

      toast({
        title: "Success",
        description: "Photo uploaded successfully!",
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload from Device
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={startCamera}
          disabled={uploading || showCamera}
          className="flex items-center gap-2"
        >
          <Camera className="h-4 w-4" />
          Take Photo
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        multiple={multiple}
        className="hidden"
      />

      {/* Camera View */}
      {showCamera && (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md mx-auto rounded-lg"
              />
              <div className="flex gap-2 justify-center">
                <Button onClick={capturePhoto} disabled={uploading}>
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Uploaded Photos Display */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Label>Uploaded Photos</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {value.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Uploaded photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          Uploading photo...
        </div>
      )}

      {/* Empty State */}
      {value.length === 0 && !showCamera && (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Image className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {placeholder || "No photos uploaded yet"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click the buttons above to upload or take a photo
          </p>
        </div>
      )}
    </div>
  );
};