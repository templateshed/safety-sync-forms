
import React, { useRef, useState, useCallback } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Card, CardContent } from './card';
import { Pen, Type, RotateCcw } from 'lucide-react';

interface SignatureFieldProps {
  value?: {
    type: 'drawn' | 'typed';
    data: string;
    typedName?: string;
  };
  onChange: (value: {
    type: 'drawn' | 'typed';
    data: string;
    typedName?: string;
  }) => void;
  label?: string;
  required?: boolean;
}

export const SignatureField: React.FC<SignatureFieldProps> = ({
  value,
  onChange,
  label,
  required = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedName, setTypedName] = useState(value?.typedName || '');
  const [activeTab, setActiveTab] = useState<'draw' | 'type'>('draw');

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  }, []);

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL();
    onChange({
      type: 'drawn',
      data: dataURL,
    });
  }, [isDrawing, onChange]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange({
      type: 'drawn',
      data: '',
    });
  }, [onChange]);

  const handleTypedNameChange = useCallback((name: string) => {
    setTypedName(name);
    
    // Generate a simple text-based signature
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    if (ctx && name.trim()) {
      ctx.font = '24px cursive';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 8);
      
      const dataURL = canvas.toDataURL();
      onChange({
        type: 'typed',
        data: dataURL,
        typedName: name,
      });
    } else if (!name.trim()) {
      onChange({
        type: 'typed',
        data: '',
        typedName: '',
      });
    }
  }, [onChange]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas for drawing
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // If there's existing drawn signature data, restore it
    if (value?.type === 'drawn' && value.data) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = value.data;
    }
  }, [value]);

  return (
    <div className="space-y-4">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'type')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw" className="flex items-center gap-2">
                <Pen className="h-4 w-4" />
                Draw Signature
              </TabsTrigger>
              <TabsTrigger value="type" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Type Name
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="draw" className="space-y-4">
              <div className="border rounded-lg bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">Sign above with your mouse or finger</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearCanvas}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="type" className="space-y-4">
              <div>
                <Input
                  value={typedName}
                  onChange={(e) => handleTypedNameChange(e.target.value)}
                  placeholder="Type your full name"
                  className="text-lg"
                />
              </div>
              {typedName && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-center text-2xl" style={{ fontFamily: 'cursive' }}>
                    {typedName}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
