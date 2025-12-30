import { useState, useEffect } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, Upload, Package, X } from 'lucide-react';
import { ProcessingResult, ImageFile } from '../../types';
import { exportToJson, exportToCsv, exportToXlsx, exportToPdf, exportAll } from '../../utils/exportUtils';
import { createEbayListingsFromResults } from '../../utils/ebayApi';
import { createFacebookPostsFromResults } from '../../utils/facebookApi';

interface ExportPanelProps {
  results: ProcessingResult[];
  images: ImageFile[];
  onClose: () => void;
}

export default function ExportPanel({ results, images, onClose }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'xlsx' | 'pdf' | 'all'>('all');
  const [isListingOnEbay, setIsListingOnEbay] = useState(false);
  const [isPostingToFacebook, setIsPostingToFacebook] = useState(false);
  const [facebookPageId, setFacebookPageId] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      let blob: Blob | null = null;

      switch (selectedFormat) {
        case 'json':
          const jsonContent = exportToJson(results);
          blob = new Blob([jsonContent], { type: 'application/json' });
          break;
        case 'csv':
          const csvContent = exportToCsv(results);
          blob = new Blob([csvContent], { type: 'text/csv' });
          break;
        case 'xlsx':
          blob = await exportToXlsx(results, images);
          break;
        case 'pdf':
          blob = await exportToPdf(results, images);
          break;
        case 'all':
          blob = await exportAll(results, images);
          break;
      }

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${new Date().toISOString().slice(0, 10)}.${getFileExtension(selectedFormat)}`;
        a.click();
        URL.revokeObjectURL(url);
      }

      setExportProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleEbayListing = async () => {
    setIsListingOnEbay(true);
    try {
      const listings = await createEbayListingsFromResults(results);
      console.log('Created eBay listings:', listings);
      alert(`Successfully created ${listings.length} eBay listings!`);
    } catch (error) {
      console.error('eBay listing failed:', error);
      alert('Failed to create eBay listings. Please check your credentials and try again.');
    } finally {
      setIsListingOnEbay(false);
    }
  };

  const handleFacebookPost = async () => {
    if (!facebookPageId) {
      alert('Please enter a Facebook page ID');
      return;
    }

    setIsPostingToFacebook(true);
    try {
      // In a real implementation, we would get the access token from the user's settings
      const accessToken = localStorage.getItem('facebookAccessToken') || '';
      const posts = await createFacebookPostsFromResults(results, facebookPageId, accessToken);
      console.log('Created Facebook posts:', posts);
      alert(`Successfully created ${posts.length} Facebook posts!`);
    } catch (error) {
      console.error('Facebook posting failed:', error);
      alert('Failed to create Facebook posts. Please check your credentials and try again.');
    } finally {
      setIsPostingToFacebook(false);
    }
  };

  const getFileExtension = (format: string) => {
    switch (format) {
      case 'json': return 'json';
      case 'csv': return 'csv';
      case 'xlsx': return 'xlsx';
      case 'pdf': return 'pdf';
      case 'all': return 'zip';
      default: return 'json';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Export & Share</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Export Format</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <button
                onClick={() => setSelectedFormat('json')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                  selectedFormat === 'json'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <FileJson className="w-8 h-8 text-blue-500 mb-1" />
                <span className="text-sm">JSON</span>
              </button>
              <button
                onClick={() => setSelectedFormat('csv')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                  selectedFormat === 'csv'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-8 h-8 text-green-500 mb-1" />
                <span className="text-sm">CSV</span>
              </button>
              <button
                onClick={() => setSelectedFormat('xlsx')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                  selectedFormat === 'xlsx'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <FileSpreadsheet className="w-8 h-8 text-green-600 mb-1" />
                <span className="text-sm">XLSX</span>
              </button>
              <button
                onClick={() => setSelectedFormat('pdf')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                  selectedFormat === 'pdf'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-8 h-8 text-red-500 mb-1" />
                <span className="text-sm">PDF</span>
              </button>
              <button
                onClick={() => setSelectedFormat('all')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border ${
                  selectedFormat === 'all'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Package className="w-8 h-8 text-purple-500 mb-1" />
                <span className="text-sm">All</span>
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Export Options</h3>
            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <Download className="w-5 h-5" />
                {isExporting ? 'Exporting...' : `Export ${selectedFormat.toUpperCase()}`}
              </button>

              {isExporting && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Direct Listing & Sharing</h3>
            <div className="space-y-3">
              <button
                onClick={handleEbayListing}
                disabled={isListingOnEbay}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-400 transition-colors"
              >
                <Upload className="w-5 h-5" />
                {isListingOnEbay ? 'Listing...' : 'List on eBay'}
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={facebookPageId}
                  onChange={(e) => setFacebookPageId(e.target.value)}
                  placeholder="Facebook Page ID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleFacebookPost}
                  disabled={isPostingToFacebook}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {isPostingToFacebook ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>Selected: {results.length} processed items</p>
            <p>Format: {selectedFormat.toUpperCase()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}