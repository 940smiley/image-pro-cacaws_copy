import { X, Zap, ShoppingCart, ExternalLink } from 'lucide-react';
import { ImageFile } from '../types';

interface ImageAnalysisPanelProps {
  image: ImageFile;
  onClose: () => void;
}

export default function ImageAnalysisPanel({ image, onClose }: ImageAnalysisPanelProps) {
  if (!image.geminiAnalysis) {
    return null;
  }

  const { geminiAnalysis, ebayData } = image;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 p-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Image Analysis
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={image.result || image.preview}
                  alt={image.file.name}
                  className="w-full aspect-square object-cover"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">File Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name: </span>
                    <span className="text-gray-800 font-medium">{image.file.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Size: </span>
                    <span className="text-gray-800 font-medium">{(image.file.size / 1024).toFixed(2)} KB</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type: </span>
                    <span className="text-gray-800 font-medium">{image.file.type || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">AI Analysis</h4>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-600 mt-1">{geminiAnalysis.description}</p>
                  </div>

                  {geminiAnalysis.objects && geminiAnalysis.objects.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Identified Objects</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {geminiAnalysis.objects.map((obj, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full"
                          >
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {geminiAnalysis.categories && geminiAnalysis.categories.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Categories</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {geminiAnalysis.categories.map((cat, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {geminiAnalysis.colors && geminiAnalysis.colors.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Colors</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {geminiAnalysis.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 text-xs bg-gray-100 px-2 py-1 rounded"
                          >
                            <div
                              className="w-4 h-4 rounded border border-gray-300"
                              style={{
                                backgroundColor: color.toLowerCase().includes('dark')
                                  ? '#333'
                                  : color.toLowerCase().includes('light')
                                    ? '#eee'
                                    : color,
                              }}
                            ></div>
                            {color}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700">Confidence</label>
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${geminiAnalysis.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 mt-1">{geminiAnalysis.confidence}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {ebayData && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    eBay Pricing Data
                  </h4>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xs text-gray-600 mb-1">Average</div>
                        <div className="text-sm font-bold text-amber-700">${ebayData.averagePrice}</div>
                      </div>
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xs text-gray-600 mb-1">Min</div>
                        <div className="text-sm font-bold text-green-700">${ebayData.minPrice}</div>
                      </div>
                      <div className="bg-white rounded p-2 text-center">
                        <div className="text-xs text-gray-600 mb-1">Max</div>
                        <div className="text-sm font-bold text-red-700">${ebayData.maxPrice}</div>
                      </div>
                    </div>

                    {ebayData.listings && ebayData.listings.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-amber-900 mb-2 block">
                          Recent Listings ({ebayData.listings.length})
                        </label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {ebayData.listings.slice(0, 5).map((listing) => (
                            <a
                              key={listing.itemId}
                              href={listing.itemUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start justify-between p-2 bg-white rounded hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-800 truncate">
                                  {listing.title}
                                </p>
                                <div className="flex gap-2 text-xs text-gray-600 mt-1">
                                  <span>{listing.condition}</span>
                                  <span>•</span>
                                  <span>{listing.sellerInfo.sellerUserName}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <span className="font-semibold text-amber-700">
                                  ${listing.currentPrice}
                                </span>
                                <ExternalLink className="w-3 h-3 text-gray-400" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
