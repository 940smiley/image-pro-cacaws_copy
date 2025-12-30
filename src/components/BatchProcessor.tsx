import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, Download, Play, AlertCircle, CheckCircle, Loader, Zap, ShoppingCart, Package, Share2, Upload as UploadIcon } from 'lucide-react';
import { ImageFile, UserSettings, CropArea, ProcessingResult } from '../types';
import { loadImageToCanvas, expandImage, cropImage, enhanceImage, downloadImage } from '../utils/imageProcessing';
import { analyzeImageWithGemini, searchEbayPricing } from '../utils/apiClient';
import { analyzeCollectibleWithGemini } from '../utils/apiClient';
import { generateSmartFilename, generateCollectibleFilename } from '../utils/filenameGenerator';
import { createMetadataObject } from '../utils/metadataHandler';
import ImageEditor from './ImageEditor';
import ImageAnalysisPanel from './ImageAnalysisPanel';

interface BatchProcessorProps {
  settings: UserSettings;
  onProcessingComplete?: (results: ProcessingResult[], images: ImageFile[]) => void;
}

const MAX_BATCH_SIZE = 100;

export default function BatchProcessor({ settings, onProcessingComplete }: BatchProcessorProps) {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > MAX_BATCH_SIZE) {
      alert(`Maximum batch size is ${MAX_BATCH_SIZE} images. You can only add ${MAX_BATCH_SIZE - images.length} more images.`);
      return;
    }

    const newImages: ImageFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      operations: [],
    }));

    setImages(prev => [...prev, ...newImages]);
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
      return prev.filter(img => img.id !== id);
    });
  };

  const handleClearAll = () => {
    images.forEach(img => {
      URL.revokeObjectURL(img.preview);
      if (img.result) {
        URL.revokeObjectURL(img.result);
      }
    });
    setImages([]);
  };

  const processImage = async (image: ImageFile): Promise<ImageFile> => {
    try {
      let canvas = await loadImageToCanvas(image.file);
      const operations = [...image.operations];

      if (settings.expand_before_crop && settings.expansion_percentage > 0) {
        canvas = expandImage(canvas, settings.expansion_percentage);
        operations.push({
          type: 'expand',
          params: { percentage: settings.expansion_percentage },
          timestamp: new Date().toISOString(),
        });
      }

      if (settings.auto_enhance) {
        canvas = enhanceImage(canvas);
        operations.push({
          type: 'enhance',
          params: {},
          timestamp: new Date().toISOString(),
        });
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        }, 'image/png');
      });

      const result = URL.createObjectURL(blob);

      return {
        ...image,
        status: 'completed',
        result,
        operations,
      };
    } catch (error) {
      return {
        ...image,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const handleProcessAll = async () => {
    setProcessing(true);

    for (let i = 0; i < images.length; i++) {
      if (images[i].status === 'completed') continue;

      setImages(prev =>
        prev.map((img, idx) =>
          idx === i ? { ...img, status: 'processing' } : img
        )
      );

      const processed = await processImage(images[i]);

      setImages(prev =>
        prev.map((img, idx) =>
          idx === i ? processed : img
        )
      );

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setProcessing(false);
  };

  const handleDownloadAll = () => {
    images.forEach((image, index) => {
      if (image.result) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          downloadImage(canvas, `processed-${index + 1}-${image.file.name}`);
        };

        img.src = image.result;
      }
    });
  };

  const handleEditImage = (image: ImageFile) => {
    setEditingImage(image);
  };

  const handleCrop = async (cropArea: CropArea) => {
    if (!editingImage) return;

    try {
      let canvas = await loadImageToCanvas(editingImage.file);

      if (settings.expand_before_crop && settings.expansion_percentage > 0) {
        canvas = expandImage(canvas, settings.expansion_percentage);
      }

      canvas = cropImage(canvas, cropArea);

      if (settings.auto_enhance) {
        canvas = enhanceImage(canvas);
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        }, 'image/png');
      });

      const result = URL.createObjectURL(blob);

      setImages(prev =>
        prev.map(img =>
          img.id === editingImage.id
            ? {
                ...img,
                status: 'completed',
                result,
                operations: [
                  ...img.operations,
                  { type: 'crop', params: cropArea, timestamp: new Date().toISOString() },
                ],
              }
            : img
        )
      );

      setEditingImage(null);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  };

  const handleDownloadCurrent = () => {
    if (!editingImage?.result) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      downloadImage(canvas, `edited-${editingImage.file.name}`);
    };

    img.src = editingImage.result;
  };

  const handleAnalyzeWithGemini = async () => {
    const unanalyzed = images.filter(img => !img.geminiAnalysis);
    if (unanalyzed.length === 0) return;

    setAnalyzing(true);
    const newAnalyzingIds = new Set(analyzingIds);

    for (const image of unanalyzed) {
      newAnalyzingIds.add(image.id);
      setAnalyzingIds(new Set(newAnalyzingIds));

      try {
        // Use specialized analysis for collectibles
        const analysis = collectibleType !== 'other'
          ? await analyzeCollectibleWithGemini(image.file, collectibleType)
          : await analyzeImageWithGemini(image.file);

        let ebayData;
        if (analysis.objects && analysis.objects.length > 0) {
          try {
            const searchQuery = analysis.objects.slice(0, 2).join(' ');
            ebayData = await searchEbayPricing(searchQuery, 15);
          } catch (error) {
            console.warn('Failed to fetch eBay pricing:', error);
          }
        }

        // Generate smart filename based on analysis
        const newFilename = analysis.collectibleDetails
          ? generateCollectibleFilename(image.file.name, analysis)
          : generateSmartFilename(image.file.name, analysis);

        setImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? {
                  ...img,
                  geminiAnalysis: analysis,
                  ebayData,
                  // Update the file object to reflect the new name
                  file: new File([image.file], newFilename, { type: image.file.type })
                }
              : img
          )
        );
      } catch (error) {
        console.error('Error analyzing image:', error);
      } finally {
        newAnalyzingIds.delete(image.id);
        setAnalyzingIds(new Set(newAnalyzingIds));
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setAnalyzing(false);
  };

  const completedCount = images.filter(img => img.status === 'completed').length;
  const errorCount = images.filter(img => img.status === 'error').length;
  const analyzedCount = images.filter(img => img.geminiAnalysis).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Batch Image Processor</h2>
        <p className="text-gray-600">Upload and process up to {MAX_BATCH_SIZE} images at once</p>
      </div>

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= MAX_BATCH_SIZE}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Upload className="w-5 h-5" />
            Upload Images ({images.length}/{MAX_BATCH_SIZE})
          </button>

          {images.length > 0 && (
            <>
              <button
                onClick={handleProcessAll}
                disabled={processing || images.every(img => img.status === 'completed')}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Process All
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <select
                  value={collectibleType}
                  onChange={(e) => setCollectibleType(e.target.value as any)}
                  className="px-3 py-3 bg-gray-100 rounded-lg border border-gray-300"
                >
                  <option value="other">General Analysis</option>
                  <option value="stamp">Stamps</option>
                  <option value="trading-card">Trading Cards</option>
                  <option value="postcard">Postcards</option>
                  <option value="war-letter">War Letters</option>
                </select>
                <button
                  onClick={handleAnalyzeWithGemini}
                  disabled={analyzing || analyzedCount === images.length}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {analyzing ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Analyze with AI
                    </>
                  )}
                </button>
              </div>

              {completedCount > 0 && (
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Download className="w-5 h-5" />
                  Download All
                </button>
              )}

              <button
                onClick={handleClearAll}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Trash2 className="w-5 h-5" />
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-gray-700">Pending: {images.filter(img => img.status === 'pending').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-700">Processing: {images.filter(img => img.status === 'processing').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Completed: {completedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-gray-700">Analyzed: {analyzedCount}</span>
            </div>
            {errorCount > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-gray-700">Errors: {errorCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No images uploaded yet</p>
          <p className="text-sm text-gray-500">Click "Upload Images" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-square relative">
                <img
                  src={image.result || image.preview}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                />

                {image.status === 'processing' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}

                {image.status === 'completed' && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}

                {image.status === 'error' && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>

              <div className="p-2">
                <p className="text-xs text-gray-600 truncate mb-2">{image.file.name}</p>

                {image.geminiAnalysis && (
                  <div className="mb-2 flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    <Zap className="w-3 h-3" />
                    <span>Analyzed</span>
                  </div>
                )}

                <div className="flex gap-1">
                  {image.geminiAnalysis ? (
                    <>
                      <button
                        onClick={() => setSelectedAnalysis(image)}
                        className="flex-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleRemoveImage(image.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditImage(image)}
                        className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveImage(image.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingImage && (
        <ImageEditor
          image={editingImage.result || editingImage.preview}
          onCrop={handleCrop}
          onClose={() => setEditingImage(null)}
          onDownload={handleDownloadCurrent}
          showGrid={settings.show_grid}
        />
      )}

      {selectedAnalysis && (
        <ImageAnalysisPanel
          image={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </div>
  );
}
