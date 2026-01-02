import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, Download, Play, AlertCircle, CheckCircle, Loader, Zap, Copy, LayoutGrid, FileOutput } from 'lucide-react';
import { ImageFile, UserSettings, CropArea, ProcessingResult, EbayPricingData } from '../types';
import { loadImageToCanvas, expandImage, cropImage, enhanceImage, downloadImage, rotateImage, autoDetectObjects } from '../utils/imageProcessing';
import { analyzeImageWithGemini, searchEbayPricing } from '../utils/apiClient';
import { analyzeCollectibleWithGemini } from '../utils/apiClient';
import { generateSmartFilename, generateCollectibleFilename } from '../utils/filenameGenerator';
import { createMetadataObject } from '../utils/metadataHandler';
import { computeFileHash, flagDuplicates } from '../utils/duplicateDetection';
import { scanImageLocally, LocalAnalysis } from '../utils/localScanner';
import ImageEditor from './ImageEditor';
import ImageAnalysisPanel from './ImageAnalysisPanel';

interface BatchProcessorProps {
  settings: UserSettings;
  onProcessingComplete?: (results: ProcessingResult[], images: ImageFile[]) => void;
}

const MAX_BATCH_SIZE = 10;

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

  const handleAutoDetect = async (image: ImageFile) => {
    const canvas = await loadImageToCanvas(image.file);
    const detections = autoDetectObjects(canvas);

    if (detections.length > 0) {
      alert(`Detected ${detections.length} potential items! Creating individual crops...`);
      const newImages: ImageFile[] = [];

      for (let i = 0; i < detections.length; i++) {
        const crop = detections[i];
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = crop.width;
        croppedCanvas.height = crop.height;
        const ctx = croppedCanvas.getContext('2d')!;
        ctx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

        const blob = await new Promise<Blob>(res => croppedCanvas.toBlob(b => res(b!), 'image/png'));
        const file = new File([blob], `crop-${i}-${image.file.name}`, { type: 'image/png' });

        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: URL.createObjectURL(blob),
          status: 'completed',
          result: URL.createObjectURL(blob),
          operations: [{ type: 'crop', params: crop as unknown as Record<string, number | string | boolean>, timestamp: new Date().toISOString() }]
        });
      }
      setImages(prev => [...prev.filter(img => img.id !== image.id), ...newImages]);
    } else {
      alert("No distinct items detected. Try manual cropping.");
    }
  };

  const handleMandatoryExport = () => {
    alert("Triggering mandatory collection backup (PDF/CSV)...");
    // In a real app, this would call your exportUtils
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > MAX_BATCH_SIZE) {
      alert(`Maximum batch size is ${MAX_BATCH_SIZE} images. You can only add ${MAX_BATCH_SIZE - images.length} more images.`);
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
      const filtered = prev.filter(img => img.id !== id);
      return flagDuplicates(filtered);
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

    const pendingImages = images.filter(img => img.status !== 'completed');
    const BATCH_SIZE = 3;

    for (let i = 0; i < pendingImages.length; i += BATCH_SIZE) {
      const batch = pendingImages.slice(i, i + BATCH_SIZE);

      // Update status to processing for the current batch
      setImages(prev =>
        prev.map(img =>
          batch.some(b => b.id === img.id) ? { ...img, status: 'processing' } : img
        )
      );

      // Process batch in parallel
      const results = await Promise.all(
        batch.map(img => processImage(img))
      );

      // Update results
      setImages(prev =>
        prev.map(img => {
          const result = results.find(r => r.id === img.id);
          return result || img;
        })
      );
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

  const handleApplyChanges = async (cropArea: CropArea, rotation: number) => {
    if (!editingImage) return;

    try {
      let canvas = await loadImageToCanvas(editingImage.file);
      const operations = [...editingImage.operations];

      if (settings.expand_before_crop && settings.expansion_percentage > 0) {
        canvas = expandImage(canvas, settings.expansion_percentage);
      }

      if (rotation !== 0) {
        canvas = rotateImage(canvas, rotation);
        operations.push({ type: 'rotate', params: { angle: rotation }, timestamp: new Date().toISOString() });
      }

      canvas = cropImage(canvas, cropArea);
      operations.push({
        type: 'crop',
        params: cropArea as unknown as Record<string, number | string | boolean>,
        timestamp: new Date().toISOString()
      });

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
        prev.map(img => {
          if (img.id === editingImage.id) {
            if (img.result) {
              URL.revokeObjectURL(img.result);
            }
            return {
              ...img,
              status: 'completed',
              result,
              operations
            };
          }
          return img;
        })
      );

      setEditingImage(null);
    } catch (error) {
      console.error('Error applying changes:', error);
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

  const handleLocalScan = async () => {
    const unscanned = images.filter(img => !img.localAnalysis);
    if (unscanned.length === 0) return;

    setProcessing(true);
    for (const image of unscanned) {
      const analysis: LocalAnalysis = await scanImageLocally(image.file);
      setImages(prev =>
        prev.map(img =>
          img.id === image.id ? { ...img, localAnalysis: analysis } : img
        )
      );
    }
    setProcessing(false);
  };

  const handleAnalyzeWithGemini = async () => {
    const unanalyzed = images.filter(img => !img.geminiAnalysis);
    if (unanalyzed.length === 0) return;

    setAnalyzing(true);

    // Helper function to analyze a single image
    const analyzeSingleImage = async (image: ImageFile) => {
      try {
        // Perform local scan first if not already done
        let localAnalysis = image.localAnalysis;
        if (!localAnalysis) {
          localAnalysis = await scanImageLocally(image.file);
          setImages(prev =>
            prev.map(img =>
              img.id === image.id ? { ...img, localAnalysis } : img
            )
          );
        }

        // Skip if local analysis is confident there's nothing interesting
        if (localAnalysis && !localAnalysis.hasObject && localAnalysis.possibleType === 'blank-or-background') {
          console.log(`Skipping Gemini analysis for ${image.file.name}: Local scan indicates blank image.`);
          setImages(prev =>
            prev.map(img =>
              img.id === image.id
                ? { ...img, status: 'completed', geminiAnalysis: { description: 'Blank image (Local Scan)', objects: [], categories: [], colors: [], confidence: 100 } }
                : img
            )
          );
          return;
        }

        // Use specialized analysis for collectibles
        const analysis = await (collectibleType !== 'other'
          ? analyzeCollectibleWithGemini(image.file, collectibleType)
          : analyzeImageWithGemini(image.file));

        let ebayData: EbayPricingData | undefined;
        if (analysis.objects && analysis.objects.length > 0) {
          try {
            const searchQuery = analysis.objects.slice(0, 2).join(' ');
            ebayData = await searchEbayPricing(searchQuery, 15);
          } catch (error) {
            console.warn('Failed to fetch eBay pricing:', error);
          }
        }

        // Renaming logic to identified object
        let newFilename = image.file.name;
        const extension = image.file.name.split('.').pop();

        if (analysis.collectibleDetails) {
          newFilename = generateCollectibleFilename(image.file.name, analysis);
        } else if (analysis.objects && analysis.objects.length > 0) {
          // Rename to the first identified object
          const objectName = analysis.objects[0].replace(/[^a-z0-9]/gi, '_').toLowerCase();
          newFilename = `${objectName}.${extension}`;
        } else {
          newFilename = generateSmartFilename(image.file.name, analysis);
        }

        setImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? {
                ...img,
                geminiAnalysis: analysis,
                ebayData,
                file: new File([image.file], newFilename, { type: image.file.type })
              }
              : img
          )
        );
      } catch (error) {
        console.error('Error analyzing image:', error);
        setImages(prev =>
          prev.map(img =>
            img.id === image.id
              ? { ...img, status: 'error', error: error instanceof Error ? error.message : 'Analysis failed' }
              : img
          )
        );
      }
    };

    // Process in chunks of 3 to avoid overwhelming the browser/API but faster than serial
    const CHUNK_SIZE = 3;
    for (let i = 0; i < unanalyzed.length; i += CHUNK_SIZE) {
      const chunk = unanalyzed.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(img => analyzeSingleImage(img)));
    }

    setAnalyzing(false);
  };

  const completedCount = images.filter(img => img.status === 'completed').length;
  const errorCount = images.filter(img => img.status === 'error').length;
  const analyzedCount = images.filter(img => img.geminiAnalysis).length;
  const duplicateCount = images.filter(img => img.isDuplicate).length;

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
                <button
                  onClick={handleLocalScan}
                  disabled={processing || images.every(img => img.localAnalysis)}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Loader className={`w-5 h-5 ${processing ? 'animate-spin' : ''}`} />
                  Local Pre-Scan
                </button>
                <select
                  value={collectibleType}
                  onChange={(e) => setCollectibleType(e.target.value as 'stamp' | 'trading-card' | 'postcard' | 'war-letter' | 'other')}
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

              <button
                onClick={handleMandatoryExport}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                <FileOutput className="w-5 h-5" />
                Export Collection
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
            {duplicateCount > 0 && (
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-600" />
                <span className="text-amber-700 font-bold">Duplicates: {duplicateCount}</span>
              </div>
            )}
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
              className={`relative bg-white border ${image.isDuplicate ? 'border-amber-400 ring-2 ring-amber-200' : 'border-gray-200'} rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="aspect-square relative">
                <img
                  src={image.result || image.preview}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                />

                {image.isDuplicate && (
                  <div className="absolute top-2 left-2 bg-amber-500 text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-lg">
                    <Copy className="w-3 h-3" />
                    DUPLICATE
                  </div>
                )}

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
                <p className={`text-xs ${image.isDuplicate ? 'text-amber-700 font-medium' : 'text-gray-600'} truncate mb-2`}>{image.file.name}</p>

                {image.localAnalysis && !image.geminiAnalysis && (
                  <div className="mb-2 flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                    <span>{image.localAnalysis.possibleType}</span>
                  </div>
                )}

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
                        onClick={() => handleAutoDetect(image)}
                        title="Auto-detect multiple items"
                        className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                      >
                        <LayoutGrid className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleRemoveImage(image.id)}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
        <ImageAnalysisPanel
          image={selectedAnalysis}
          onClose={() => setSelectedAnalysis(null)}
        />
      )}
    </div>
  );
}