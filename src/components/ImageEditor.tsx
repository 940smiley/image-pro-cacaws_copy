import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, X, ZoomIn, ZoomOut, Wand2, Hash, RotateCcw, RotateCw } from 'lucide-react';
import { CropArea } from '../types';
import { supabase } from '../lib/supabase';

interface ImageEditorProps {
  image: string;
  onApply: (cropArea: CropArea, rotation: number) => void;
  onClose: () => void;
  onDownload: () => void;
  showGrid: boolean;
}

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r' | 'move';

export default function ImageEditor({ image, onApply, onClose, onDownload, showGrid }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, area: { ...cropArea } });
  const [perfCount, setPerfCount] = useState<{ horizontal: number, vertical: number } | null>(null);
  const [perfCountLoading, setPerfCountLoading] = useState(false);
  const [perfCountError, setPerfCountError] = useState<string | null>(null);
  const [magicCropLoading, setMagicCropLoading] = useState(false);
  const [magicCropError, setMagicCropError] = useState<string | null>(null);


  const imageRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement, canvasWidth: number, canvasHeight: number, area: CropArea, rot: number, imgDrawWidth: number, imgDrawHeight: number) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw rotated image
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -imgDrawWidth / 2, -imgDrawHeight / 2, imgDrawWidth, imgDrawHeight);
    ctx.restore();

    // Darken background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Clear crop area
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.width, area.height);
    ctx.clip();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -imgDrawWidth / 2, -imgDrawHeight / 2, imgDrawWidth, imgDrawHeight);
    ctx.restore();

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(area.x + (area.width / 3) * i, area.y);
        ctx.lineTo(area.x + (area.width / 3) * i, area.y + area.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(area.x, area.y + (area.height / 3) * i);
        ctx.lineTo(area.x + area.width, area.y + (area.height / 3) * i);
        ctx.stroke();
      }
    }

    // Border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(area.x, area.y, area.width, area.height);

    // Handles
    const hs = 10; // handle size
    ctx.fillStyle = '#3b82f6';

    // Corners
    ctx.fillRect(area.x - hs / 2, area.y - hs / 2, hs, hs); // TL
    ctx.fillRect(area.x + area.width - hs / 2, area.y - hs / 2, hs, hs); // TR
    ctx.fillRect(area.x - hs / 2, area.y + area.height - hs / 2, hs, hs); // BL
    ctx.fillRect(area.x + area.width - hs / 2, area.y + area.height - hs / 2, hs, hs); // BR

    // Sides
    ctx.fillRect(area.x + area.width / 2 - hs / 2, area.y - hs / 2, hs, hs); // T
    ctx.fillRect(area.x + area.width / 2 - hs / 2, area.y + area.height - hs / 2, hs, hs); // B
    ctx.fillRect(area.x - hs / 2, area.y + area.height / 2 - hs / 2, hs, hs); // L
    ctx.fillRect(area.x + area.width - hs / 2, area.y + area.height / 2 - hs / 2, hs, hs); // R
  }, [showGrid]);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      // Trigger a re-render to ensure size calculation happens
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = image;
  }, [image]);

  // Handle drawing and resizing
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const maxWidth = 800;
    const maxHeight = 600;
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));
    const rotatedWidth = img.width * cos + img.height * sin;
    const rotatedHeight = img.width * sin + img.height * cos;

    const scaleFactor = Math.min(maxWidth / rotatedWidth, maxHeight / rotatedHeight, 1);
    const displayWidth = rotatedWidth * scaleFactor;
    const displayHeight = rotatedHeight * scaleFactor;

    // Only update canvas dimensions if they changed to avoid flickering/clearing
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      setImageSize({ width: displayWidth, height: displayHeight });
    }

    draw(ctx, img, displayWidth, displayHeight, cropArea, rotation, img.width * scaleFactor, img.height * scaleFactor);
  }, [image, rotation, cropArea, draw, imageSize.width]); // Added imageSize.width to dependency to retry if load happened


  const getHandleAt = (x: number, y: number): HandleType | null => {
    const hs = 20; // Larger hit area
    const { x: ax, y: ay, width: aw, height: ah } = cropArea;

    if (Math.abs(x - ax) < hs && Math.abs(y - ay) < hs) return 'tl';
    if (Math.abs(x - (ax + aw)) < hs && Math.abs(y - ay) < hs) return 'tr';
    if (Math.abs(x - ax) < hs && Math.abs(y - (ay + ah)) < hs) return 'bl';
    if (Math.abs(x - (ax + aw)) < hs && Math.abs(y - (ay + ah)) < hs) return 'br';

    if (Math.abs(x - (ax + aw / 2)) < hs && Math.abs(y - ay) < hs) return 't';
    if (Math.abs(x - (ax + aw / 2)) < hs && Math.abs(y - (ay + ah)) < hs) return 'b';
    if (Math.abs(x - ax) < hs && Math.abs(y - (ay + ah / 2)) < hs) return 'l';
    if (Math.abs(x - (ax + aw)) < hs && Math.abs(y - (ay + ah / 2)) < hs) return 'r';

    if (x > ax && x < ax + aw && y > ay && y < ay + ah) return 'move';

    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);

    const handle = getHandleAt(x, y);
    if (handle) {
      setActiveHandle(handle);
      setDragStart({ x, y, area: { ...cropArea } });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeHandle) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const newArea = { ...dragStart.area };

    switch (activeHandle) {
      case 'move':
        newArea.x = Math.max(0, Math.min(dragStart.area.x + dx, imageSize.width - newArea.width));
        newArea.y = Math.max(0, Math.min(dragStart.area.y + dy, imageSize.height - newArea.height));
        break;
      case 'tl':
        newArea.x = Math.max(0, Math.min(dragStart.area.x + dx, dragStart.area.x + dragStart.area.width - 20));
        newArea.y = Math.max(0, Math.min(dragStart.area.y + dy, dragStart.area.y + dragStart.area.height - 20));
        newArea.width = dragStart.area.width - (newArea.x - dragStart.area.x);
        newArea.height = dragStart.area.height - (newArea.y - dragStart.area.y);
        break;
      case 'br':
        newArea.width = Math.max(20, Math.min(dragStart.area.width + dx, imageSize.width - dragStart.area.x));
        newArea.height = Math.max(20, Math.min(dragStart.area.height + dy, imageSize.height - dragStart.area.y));
        break;
      case 'tr':
        newArea.y = Math.max(0, Math.min(dragStart.area.y + dy, dragStart.area.y + dragStart.area.height - 20));
        newArea.width = Math.max(20, Math.min(dragStart.area.width + dx, imageSize.width - dragStart.area.x));
        newArea.height = dragStart.area.height - (newArea.y - dragStart.area.y);
        break;
      case 'bl':
        newArea.x = Math.max(0, Math.min(dragStart.area.x + dx, dragStart.area.x + dragStart.area.width - 20));
        newArea.width = dragStart.area.width - (newArea.x - dragStart.area.x);
        newArea.height = Math.max(20, Math.min(dragStart.area.height + dy, imageSize.height - dragStart.area.y));
        break;
      case 't':
        newArea.y = Math.max(0, Math.min(dragStart.area.y + dy, dragStart.area.y + dragStart.area.height - 20));
        newArea.height = dragStart.area.height - (newArea.y - dragStart.area.y);
        break;
      case 'b':
        newArea.height = Math.max(20, Math.min(dragStart.area.height + dy, imageSize.height - dragStart.area.y));
        break;
      case 'l':
        newArea.x = Math.max(0, Math.min(dragStart.area.x + dx, dragStart.area.x + dragStart.area.width - 20));
        newArea.width = dragStart.area.width - (newArea.x - dragStart.area.x);
        break;
      case 'r':
        newArea.width = Math.max(20, Math.min(dragStart.area.width + dx, imageSize.width - dragStart.area.x));
        break;
    }
    setCropArea(newArea);
  };

  const handleMagicCrop = async () => {
    setMagicCropLoading(true);
    setMagicCropError(null);
    try {
      const imageBase64 = image.split(',')[1];
      const mimeType = image.split(',')[0].split(':')[1].split(';')[0];

      const { data: analysis, error } = await supabase.functions.invoke('analyze-image-gemini', {
        body: {
          imageBase64,
          mimeType,
          collectibleType: 'other', // Or derive this from context
        },
      });

      if (error) throw error;

      if (analysis.boundingBox) {
        const [x1, y1, x2, y2] = analysis.boundingBox;
        const img = imageRef.current;
        if (img) {
          const { width: naturalWidth, height: naturalHeight } = img;
          const { width: displayWidth, height: displayHeight } = imageSize;

          const scaleX = displayWidth / naturalWidth;
          const scaleY = displayHeight / naturalHeight;

          setCropArea({
            x: x1 * scaleX,
            y: y1 * scaleY,
            width: (x2 - x1) * scaleX,
            height: (y2 - y1) * scaleY,
          });
        }
      } else {
        throw new Error('Magic Crop could not find an object to crop.');
      }
    } catch (e: any) {
      setMagicCropError(e.message);
      setTimeout(() => setMagicCropError(null), 5000);
    } finally {
      setMagicCropLoading(false);
    }
  };

  const handlePerfCount = async () => {
    setPerfCountLoading(true);
    setPerfCountError(null);
    try {
      const imageBase64 = image.split(',')[1];
      const { data, error } = await supabase.functions.invoke('calculate-perf-count', {
        body: { imageBase64 },
      });

      if (error) throw error;

      setPerfCount(data);

    } catch (e: any) {
      setPerfCountError(e.message);
      setTimeout(() => setPerfCountError(null), 5000);
    } finally {
      setPerfCountLoading(false);
    }
  };

  const handleApply = () => {
    const img = new Image();
    img.onload = () => {
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      const rotatedWidth = img.width * cos + img.height * sin;
      const rotatedHeight = img.width * sin + img.height * cos;
      const scaleX = rotatedWidth / imageSize.width;
      const scaleY = rotatedHeight / imageSize.height;

      onApply({
        x: cropArea.x * scaleX,
        y: cropArea.y * scaleY,
        width: cropArea.width * scaleX,
        height: cropArea.height * scaleY,
      }, rotation);
    };
    img.src = image;
  };

  const handleRotationChange = (angle: number) => {
    setRotation(prev => prev + angle);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Advanced Image Editor</h3>
            <p className="text-xs text-gray-500">Precise cropping & technical analysis</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-100 flex flex-col items-center">
          <div className="relative group">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={() => setActiveHandle(null)}
              onMouseLeave={() => setActiveHandle(null)}
              className="bg-white shadow-2xl rounded border border-gray-300 cursor-crosshair"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
            />

            {perfCount && (
              <div className="absolute -top-12 left-0 right-0 flex justify-center">
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                  <Hash className="w-3 h-3" />
                  Perf Count: {perfCount.horizontal} x {perfCount.vertical}
                </div>
              </div>
            )}
            
            {magicCropError && (
              <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  {magicCropError}
                </div>
              </div>
            )}

            {perfCountError && (
              <div className="absolute -bottom-16 left-0 right-0 flex justify-center">
                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  {perfCountError}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4 bg-white p-2 rounded-full shadow-sm border">
            <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-2 hover:bg-gray-100 rounded-full"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(3, scale + 0.1))} className="p-2 hover:bg-gray-100 rounded-full"><ZoomIn className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <button onClick={() => handleRotationChange(-15)} className="p-2 hover:bg-gray-200 rounded-full"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={() => handleRotationChange(15)} className="p-2 hover:bg-gray-200 rounded-full"><RotateCw className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] uppercase font-bold text-gray-500 mb-1 block">Fine Rotation ({rotation}°)</label>
              <input
                type="range" min="-45" max="45" value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleMagicCrop}
                disabled={magicCropLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold disabled:bg-gray-500"
              >
                {magicCropLoading ? 'Analyzing...' : <><Wand2 className="w-4 h-4" /> Magic Crop</>}
              </button>
              <button
                onClick={handlePerfCount}
                disabled={perfCountLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-bold disabled:bg-gray-500"
              >
                {perfCountLoading ? 'Counting...' : <><Hash className="w-4 h-4" /> Perf Count</>}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-transform active:scale-95 font-bold"
            >
              Confirm Changes
            </button>
            <button
              onClick={onDownload}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}