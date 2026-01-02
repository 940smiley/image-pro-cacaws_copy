import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Upload, Trash2, Play, CheckCircle, Loader, Zap } from 'lucide-react';
import { ImageFile, UserSettings, CropArea, ProcessingResult } from '../types';
import { loadImageToCanvas, expandImage, cropImage, enhanceImage, rotateImage, downloadImage } from '../utils/imageProcessing';
import { analyzeImageWithGemini } from '../utils/apiClient';
import { analyzeCollectibleWithGemini } from '../utils/apiClient';
import { generateSmartFilename } from '../utils/filenameGenerator';
import { createMetadataObject } from '../utils/metadataHandler';
import { computeFileHash, flagDuplicates } from '../utils/duplicateDetection';
import ImageEditor from './ImageEditor';
import ImageAnalysisPanel from './ImageAnalysisPanel';

interface BatchProcessorProps {
  settings: UserSettings;
  onProcessingComplete?: (results: ProcessingResult[], images: ImageFile[]) => void;
}

const MAX_BATCH_SIZE = 100;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function BatchProcessor({ settings, onProcessingComplete }: BatchProcessorProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ImageFile | null>(null);
  const [editingImage, setEditingImage] = useState<ImageFile | null>(null);
  const [collectibleType, setCollectibleType] = useState<'stamp' | 'trading-card' | 'postcard' | 'war-letter' | 'other'>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // When processing is complete, call the callback if provided
    if (!processing && images.length > 0 && images.every(img => img.status === 'completed')) {
      const results: ProcessingResult[] = images.map(img => ({
        id: img.id,
        originalFilename: img.file.name,
        newFilename: img.geminiAnalysis ? generateSmartFilename(img.file.name, img.geminiAnalysis) : img.file.name,
        analysis: img.geminiAnalysis || {
          description: '',
          objects: [],
          categories: [],
          colors: [],
          confidence: 0
        },
        operations: img.operations,
        metadata: img.geminiAnalysis ? createMetadataObject(img.geminiAnalysis, img.operations, img.file.name) : {},
        exportFormats: {}
      }));

      if (onProcessingComplete) {
        onProcessingComplete(results, images);
      }
    }
  }, [processing, images, onProcessingComplete]);


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > MAX_BATCH_SIZE) {
      alert(`Maximum batch size is ${MAX_BATCH_SIZE} images.`);
      return;
    }

    const newImagesWithHashes = await Promise.all(files.map(async (file) => {
      const hash = await computeFileHash(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        status: 'pending' as const,
        operations: [],
        hash
      };
    }));

    setImages(prev => flagDuplicates([...prev, ...newImagesWithHashes]));
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
        if (image.result) {
          URL.revokeObjectURL(image.result);
        }
      }
      return flagDuplicates(prev.filter(img => img.id !== id));
    });
  };

  const handleClearAll = () => {
    images.forEach(img => {
      URL.revokeObjectURL(img.preview);
      if (img.result) URL.revokeObjectURL(img.result);
    });
    setImages([]);
  };

  const processImage = async (image: ImageFile): Promise<ImageFile> => {
    try {
      let canvas = await loadImageToCanvas(image.file);
      const operations = [...image.operations];

      if (settings.expand_before_crop && settings.expansion_percentage > 0) {
        canvas = expandImage(canvas, settings.expansion_percentage);
        operations.push({ type: 'expand', params: { percentage: settings.expansion_percentage }, timestamp: new Date().toISOString() });
      }

      if (settings.auto_enhance) {
        canvas = enhanceImage(canvas);
        operations.push({ type: 'enhance', params: {}, timestamp: new Date().toISOString() });
      }

      const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(), 'image/png'));
      return { ...image, status: 'completed', result: URL.createObjectURL(blob), operations };
    } catch {
      return { ...image, status: 'error', error: 'Process failed' };
    }
  };

  const handleProcessAll = async () => {
    setProcessing(true);
    const pending = images.filter(img => img.status !== 'completed');
    const CHUNK = 5;
    for (let i = 0; i < pending.length; i += CHUNK) {
      const batch = pending.slice(i, i + CHUNK);
      setImages(prev => prev.map(img => batch.some(b => b.id === img.id) ? { ...img, status: 'processing' } : img));
      const results = await Promise.all(batch.map(img => processImage(img)));
      setImages(prev => prev.map(img => results.find(r => r.id === img.id) || img));
    }
    setProcessing(false);
  };


  const handleEditImage = (image: ImageFile) => setEditingImage(image);

  const handleApplyChanges = async (cropArea: CropArea, rotation: number) => {
    if (!editingImage) return;
    try {
      let canvas = await loadImageToCanvas(editingImage.file);
      const operations = [...editingImage.operations];
      if (rotation) {
        canvas = rotateImage(canvas, rotation);
        operations.push({ type: 'rotate', params: { angle: rotation }, timestamp: new Date().toISOString() });
      }
      canvas = cropImage(canvas, cropArea);
      operations.push({ type: 'crop', params: cropArea as unknown as Record<string, number | string | boolean>, timestamp: new Date().toISOString() });
      const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'));
      setImages(prev => prev.map(img => img.id === editingImage.id ? { ...img, status: 'completed', result: URL.createObjectURL(blob), operations } : img));
      setEditingImage(null);
    } catch (e) { console.error(e); }
  };

  const handleDownloadCurrent = () => {
    if (!editingImage?.result) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      downloadImage(canvas, `edited-${editingImage.file.name}`);
    };
    img.src = editingImage.result;
  };


  const handleAnalyzeWithGemini = async () => {
    const unanalyzed = images.filter(img => !img.geminiAnalysis);
    setAnalyzing(true);
    const analyze = async (image: ImageFile) => {
      try {
        const analysis = await (collectibleType !== 'other' ? analyzeCollectibleWithGemini(image.file, collectibleType) : analyzeImageWithGemini(image.file));
        const extension = image.file.name.split('.').pop();
        const newName = analysis.objects?.[0] ? `${analysis.objects[0].replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}` : image.file.name;
        setImages(prev => prev.map(img => img.id === image.id ? { ...img, geminiAnalysis: analysis, file: new File([image.file], newName, { type: image.file.type }) } : img));
      } catch (e) { console.error(e); }
    };
    const CHUNK = 3;
    for (let i = 0; i < unanalyzed.length; i += CHUNK) {
      await Promise.all(unanalyzed.slice(i, i + CHUNK).map(analyze));
    }
    setAnalyzing(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <h2 className="text-4xl font-black premium-gradient-text mb-2">Batch Processor Pro</h2>
          <p className="text-gray-500 font-medium">Enterprise-grade high-volume image analysis</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_BATCH_SIZE}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/20 font-bold active:scale-95"
          >
            <Upload className="w-5 h-5" />
            Upload {images.length > 0 && `(${images.length}/${MAX_BATCH_SIZE})`}
          </button>

          <AnimatePresence>
            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-2"
              >
                <button
                  onClick={handleProcessAll}
                  disabled={processing}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:bg-gray-400 font-bold shadow-lg hover:shadow-green-500/20 active:scale-95"
                >
                  {processing ? <Loader className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                  Process
                </button>
                <button
                  onClick={handleClearAll}
                  className="p-3 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {images.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center gap-4 p-4 glass-card rounded-2xl"
        >
          <div className="flex items-center gap-4 flex-1">
            <select
              value={collectibleType}
              onChange={(e) => setCollectibleType(e.target.value as 'stamp' | 'trading-card' | 'postcard' | 'war-letter' | 'other')}
              className="px-4 py-2 bg-white/50 rounded-xl border border-gray-200 font-bold focus:ring-2 ring-purple-500 transition-all outline-none"
            >
              <option value="other">General Mode</option>
              <option value="stamp">Stamps</option>
              <option value="trading-card">Cards</option>
              <option value="postcard">Postcards</option>
            </select>
            <button
              onClick={handleAnalyzeWithGemini}
              disabled={analyzing}
              className="flex items-center gap-2 px-6 py-2 premium-gradient text-white rounded-xl font-bold hover:opacity-90 active:scale-95 shadow-lg shadow-purple-500/20"
            >
              {analyzing ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Run AI Analysis
            </button>
          </div>

          <div className="flex gap-4 text-xs font-bold text-gray-400">
            <span>TOTAL: {images.length}</span>
            <span className="text-green-500">READY: {images.filter(i => i.status === 'completed').length}</span>
            <span className="text-purple-500">ANALYZED: {images.filter(i => i.geminiAnalysis).length}</span>
          </div>
        </motion.div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

      {images.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="aspect-[21/9] border-2 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center glass-card group cursor-pointer hover:border-blue-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 mb-2">Drop your collection here</h3>
          <p className="text-gray-400 font-medium">Supports high-res PNG, JPG and WEBP up to 100 items</p>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          <AnimatePresence mode="popLayout">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "relative aspect-[4/5] glass-card rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500",
                  image.status === 'error' && "ring-2 ring-red-500"
                )}
              >
                <img src={image.result || image.preview} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <p className="text-white text-[10px] font-bold truncate mb-3">{image.file.name}</p>
                  <div className="flex gap-2">
                    <button onClick={() => image.geminiAnalysis ? setSelectedAnalysis(image) : handleEditImage(image)} className="flex-1 py-2 bg-white text-black rounded-xl text-[10px] font-black hover:bg-gray-100 active:scale-95 transition-all">
                      {image.geminiAnalysis ? 'INSIGHTS' : 'EDIT'}
                    </button>
                    <button onClick={() => handleRemoveImage(image.id)} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 active:scale-95 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {image.status === 'processing' && (
                  <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center">
                    <Loader className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}

                <div className="absolute top-4 right-4">
                  {image.status === 'completed' && <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg"><CheckCircle className="w-3 h-3" /></div>}
                  {image.geminiAnalysis && <div className="bg-purple-600 text-white p-1.5 rounded-full shadow-lg mt-2"><Zap className="w-3 h-3" /></div>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {editingImage && (
          <ImageEditor
            image={editingImage.result || editingImage.preview}
            onApply={handleApplyChanges}
            onClose={() => setEditingImage(null)}
            onDownload={handleDownloadCurrent}
            showGrid={settings.show_grid}
          />
        )}
        {selectedAnalysis && (
          <ImageAnalysisPanel image={selectedAnalysis} onClose={() => setSelectedAnalysis(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}