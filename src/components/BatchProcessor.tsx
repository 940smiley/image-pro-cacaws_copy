import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Upload, Trash2, CheckCircle, Loader, Zap, Package, Edit } from 'lucide-react';
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
  const [focusedImageId, setFocusedImageId] = useState<string | null>(null);
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
        side: 'none' as const,
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

  const handleUnifiedProcess = async () => {
    const pending = images.filter(img => img.status !== 'completed' || !img.geminiAnalysis);
    if (pending.length === 0) return;

    setProcessing(true);
    setAnalyzing(true);
    // Start focusing on the first pending image
    setFocusedImageId(pending[0].id);

    const processAndAnalyze = async (image: ImageFile) => {
      // Set focus to current image
      setFocusedImageId(image.id);

      try {
        let currentImg = { ...image };

        // Step 1: Enhancement (if not already completed)
        if (currentImg.status !== 'completed') {
          setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'processing', statusText: 'Enhancing...' } : img));
          currentImg = await processImage(currentImg);
        }

        // Step 2: AI Analysis
        setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'analyzing', statusText: 'Identifying...' } : img));

        const analysis = await (collectibleType !== 'other'
          ? analyzeCollectibleWithGemini(currentImg.file, collectibleType)
          : analyzeImageWithGemini(currentImg.file));

        setImages(prev => prev.map(img => img.id === image.id ? { ...img, statusText: 'Renaming...' } : img));

        const extension = currentImg.file.name.split('.').pop();
        const objectName = analysis.objects?.[0]
          ? analysis.objects[0].replace(/[^a-z0-9]/gi, '_').toLowerCase()
          : 'item';
        const timestamp = new Date().getTime().toString().slice(-4);
        const nameSuffix = currentImg.side !== 'none' ? `_${currentImg.side}` : '';
        const newName = `${objectName}${nameSuffix}_${timestamp}.${extension}`;

        setImages(prev => prev.map(img => img.id === image.id ? {
          ...img,
          status: 'completed',
          statusText: 'Ready',
          geminiAnalysis: analysis,
          file: new File([currentImg.file], newName, { type: currentImg.file.type })
        } : img));

      } catch (e) {
        console.error(e);
        setImages(prev => prev.map(img => img.id === image.id ? { ...img, status: 'error', error: 'Automation failed' } : img));
      }
    };

    const CHUNK = 2;
    for (let i = 0; i < pending.length; i += CHUNK) {
      await Promise.all(pending.slice(i, i + CHUNK).map(processAndAnalyze));
      // Update focus to next image in the queue if any
      const next = pending[i + CHUNK];
      setFocusedImageId(next ? next.id : null);
    }
    // Clear focus after all done
    setFocusedImageId(null);

    setProcessing(false);
    setAnalyzing(false);
  };


  const setItemSide = (id: string, side: 'front' | 'back' | 'none') => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, side } : img));
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
                  onClick={handleUnifiedProcess}
                  disabled={processing || analyzing}
                  className="flex items-center gap-2 px-6 py-3 premium-gradient text-white rounded-2xl hover:opacity-90 disabled:bg-gray-400 font-bold shadow-lg hover:shadow-purple-500/20 active:scale-95"
                >
                  {processing || analyzing ? <Loader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  Run Full Automation
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
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Analysis Mode</span>
              <select
                value={collectibleType}
                onChange={(e) => setCollectibleType(e.target.value as 'stamp' | 'trading-card' | 'postcard' | 'war-letter' | 'other')}
                className="px-4 py-2 bg-white/50 rounded-xl border border-gray-200 font-bold focus:ring-2 ring-purple-500 transition-all outline-none text-sm"
              >
                <option value="other">General Mode</option>
                <option value="stamp">Stamps</option>
                <option value="trading-card">Cards</option>
                <option value="postcard">Postcards</option>
                <option value="war-letter">War Letters</option>
              </select>
            </div>

            <button
              onClick={handleUnifiedProcess}
              disabled={processing || analyzing}
              className="flex items-center gap-2 px-8 py-3 premium-gradient text-white rounded-xl font-bold hover:opacity-90 active:scale-95 shadow-lg shadow-purple-500/20 mt-5"
            >
              {processing || analyzing ? <Loader className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              Full Automation
            </button>
          </div>

          <div className="flex gap-4 text-xs font-bold text-gray-400">
            <span>TOTAL: {images.length}</span>
            <span className="text-green-500">READY: {images.filter(i => i.status === 'completed').length}</span>
            <span className="text-purple-500">ANALYZED: {images.filter(i => i.geminiAnalysis).length}</span>
          </div>

          {images.some(img => img.status === 'completed' || img.geminiAnalysis) && (
            <button
              onClick={() => {
                const results: ProcessingResult[] = images
                  .filter(img => img.status === 'completed' || img.geminiAnalysis)
                  .map(img => ({
                    id: img.id,
                    originalFilename: img.file.name,
                    newFilename: img.file.name, // The file object already has the generic/new name
                    analysis: img.geminiAnalysis || { description: '', objects: [], categories: [], colors: [], confidence: 0 },
                    operations: img.operations,
                    metadata: img.geminiAnalysis ? createMetadataObject(img.geminiAnalysis, img.operations, img.file.name) : {},
                    exportFormats: {}
                  }));
                if (onProcessingComplete) onProcessingComplete(results, images.filter(img => img.status === 'completed' || img.geminiAnalysis));
                alert('Sent to Collection!');
              }}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <Package className="w-4 h-4" />
              Transfer to Collection
            </button>
          )}
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

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-[10px] font-bold truncate">{image.file.name}</p>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditImage(image)} className="p-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleRemoveImage(image.id)} className="p-1.5 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setItemSide(image.id, 'front')}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all",
                        image.side === 'front' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40" : "bg-white/10 text-white/60 hover:bg-white/20"
                      )}
                    >
                      FRONT
                    </button>
                    <button
                      onClick={() => setItemSide(image.id, 'back')}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all",
                        image.side === 'back' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40" : "bg-white/10 text-white/60 hover:bg-white/20"
                      )}
                    >
                      BACK
                    </button>
                  </div>

                  {image.geminiAnalysis && (
                    <button onClick={() => setSelectedAnalysis(image)} className="w-full py-2 bg-white text-black rounded-xl text-[10px] font-black hover:bg-gray-100 active:scale-95 transition-all">
                      VIEW INSIGHTS
                    </button>
                  )}
                </div>

                {image.status === 'processing' && (
                  <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center">
                    <Loader className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}

                {image.status === 'analyzing' && (
                  <div className="absolute inset-0 bg-purple-600/30 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
                    <Zap className="w-8 h-8 text-white animate-pulse mb-2" />
                    <p className="text-white text-[10px] font-black uppercase tracking-widest mb-2">{image.statusText}</p>
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-full h-full bg-white shadow-[0_0_10px_purple]"
                      />
                    </div>
                  </div>
                )}

                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {image.status === 'completed' && <div className="bg-green-500 text-white p-1.5 rounded-full shadow-lg"><CheckCircle className="w-3 h-3" /></div>}
                  {image.geminiAnalysis && <div className="bg-purple-600 text-white p-1.5 rounded-full shadow-lg"><Zap className="w-3 h-3" /></div>}
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

        {/* Focus Overlay */}
        {focusedImageId && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full relative">
              <button
                onClick={() => setFocusedImageId(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              {(() => {
                const img = images.find(i => i.id === focusedImageId);
                if (!img) return null;
                return (
                  <div className="flex flex-col items-center gap-4">
                    <img src={img.result || img.preview} className="max-h-64 object-contain" alt="" />
                    <p className="text-white text-sm font-medium">{img.statusText || img.status}</p>
                    {img.geminiAnalysis && (
                      <div className="w-full">
                        <h3 className="text-white text-base font-bold mb-2">AI Insight</h3>
                        <p className="text-gray-300 text-sm">{img.geminiAnalysis.description}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}