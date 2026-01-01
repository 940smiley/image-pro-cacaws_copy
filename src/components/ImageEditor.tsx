import { useState, useRef, useEffect } from 'react';
import { Crop, Download, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { CropArea } from '../types';

interface ImageEditorProps {
  image: string;
  onApply: (cropArea: CropArea, rotation: number) => void;
  onClose: () => void;
  onDownload: () => void;
  showGrid: boolean;
}

export default function ImageEditor({ image, onApply, onClose, onDownload, showGrid }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 50, y: 50, width: 200, height: 200 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      setImageSize({ width, height });

      setCropArea({
        x: width * 0.1,
        y: height * 0.1,
        width: width * 0.8,
        height: height * 0.8,
      });

      draw(ctx, img, width, height, {
        x: width * 0.1,
        y: height * 0.1,
        width: width * 0.8,
        height: height * 0.8,
      }, rotation);
    };
    img.src = image;
  }, [image, rotation]);

  const draw = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, width: number, height: number, area: CropArea, rot: number) => {
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.width, area.height);
    ctx.clip();
    
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();

    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
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

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.strokeRect(area.x, area.y, area.width, area.height);

    const handleSize = 12;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(area.x - handleSize / 2, area.y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(area.x + area.width - handleSize / 2, area.y - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(area.x - handleSize / 2, area.y + area.height - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(area.x + area.width - handleSize / 2, area.y + area.height - handleSize / 2, handleSize, handleSize);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);

    if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / canvas.width);
    const y = (e.clientY - rect.top) / (rect.height / canvas.height);

    const newX = Math.max(0, Math.min(x - cropArea.width / 2, imageSize.width - cropArea.width));
    const newY = Math.max(0, Math.min(y - cropArea.height / 2, imageSize.height - cropArea.height));

    const newCropArea = { ...cropArea, x: newX, y: newY };
    setCropArea(newCropArea);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = new Image();
      img.onload = () => draw(ctx, img, imageSize.width, imageSize.height, newCropArea, rotation);
      img.src = image;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResize = (direction: 'width' | 'height', delta: number) => {
    const newCropArea = { ...cropArea };

    if (direction === 'width') {
      newCropArea.width = Math.max(50, Math.min(cropArea.width + delta, imageSize.width - cropArea.x));
    } else {
      newCropArea.height = Math.max(50, Math.min(cropArea.height + delta, imageSize.height - cropArea.y));
    }

    setCropArea(newCropArea);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const img = new Image();
      img.onload = () => draw(ctx, img, imageSize.width, imageSize.height, newCropArea, rotation);
      img.src = image;
    }
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      const scaleX = img.width / imageSize.width;
      const scaleY = img.height / imageSize.height;

      const actualCropArea = {
        x: cropArea.x * scaleX,
        y: cropArea.y * scaleY,
        width: cropArea.width * scaleX,
        height: cropArea.height * scaleY,
      };

      onApply(actualCropArea, rotation);
    };
    img.src = image;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">Edit Image</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex justify-center mb-4">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="border border-gray-300 rounded-lg cursor-move shadow-lg"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
            />
          </div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-gray-700">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(Math.min(2, scale + 0.1))}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <RotateCw className="w-4 h-4" />
              Rotation: {rotation}°
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setRotation((r) => (r - 1 + 360) % 360)}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold"
              >
                -1°
              </button>
              <input
                type="range"
                min="0"
                max="359"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <button
                onClick={() => setRotation((r) => (r + 1) % 360)}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold"
              >
                +1°
              </button>
              <button
                onClick={() => setRotation(0)}
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs font-medium"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Width</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResize('width', -10)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={Math.round(cropArea.width)}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleResize('width', value - cropArea.width);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleResize('width', 10)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Height</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleResize('height', -10)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  value={Math.round(cropArea.height)}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    handleResize('height', value - cropArea.height);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleResize('height', 10)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RotateCw className="w-5 h-5" />
              Apply Changes
            </button>
            <button
              onClick={onDownload}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
