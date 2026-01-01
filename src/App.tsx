import { useState, useEffect } from 'react';
import { Image as ImageIcon, Settings as SettingsIcon, Info, Upload, Download, Share2, Package } from 'lucide-react';
import BatchProcessor from './components/BatchProcessor';
import Settings from './components/Settings';
import ExportPanel from './components/ExportPanel';
import AiProviderConfig from './components/AiProviderConfig';
import EbayConfig from './components/EbayConfig';
import { supabase } from './lib/supabase';
import { themeManager } from './lib/themeManager';
import { UserSettings, ProcessingResult, ImageFile } from './types';

type TabType = 'processor' | 'settings' | 'about' | 'export' | 'ai-config' | 'ebay-config';

const defaultSettings: UserSettings = {
  id: '',
  user_id: '',
  auto_enhance: true,
  expand_before_crop: true,
  expansion_percentage: 20,
  theme: 'light',
  show_grid: true,
  show_tips: true,
  created_at: '',
  updated_at: '',
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('processor');
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showAiProviderConfig, setShowAiProviderConfig] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [processedImages, setProcessedImages] = useState<ImageFile[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedTheme = themeManager.getSavedTheme() || ('auto' as any);
      themeManager.applyTheme(savedTheme);

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setSettings(data);
          themeManager.applyTheme(data.theme as any);
        } else {
          const newSettings = {
            user_id: user.id,
            ...defaultSettings,
          };
          const { data: created } = await supabase
            .from('user_settings')
            .insert(newSettings)
            .select()
            .maybeSingle();

          if (created) {
            setSettings(created);
            themeManager.applyTheme(created.theme as any);
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (theme: string) => {
    themeManager.initializeTheme(theme as any);
  };

  const tabs = [
    { id: 'processor' as TabType, label: 'Image Processor', icon: ImageIcon },
    { id: 'export' as TabType, label: 'Export & Share', icon: Share2 },
    { id: 'ai-config' as TabType, label: 'AI Providers', icon: SettingsIcon },
    { id: 'ebay-config' as TabType, label: 'eBay Config', icon: Package },
    { id: 'settings' as TabType, label: 'App Settings', icon: SettingsIcon },
    { id: 'about' as TabType, label: 'About', icon: Info },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Image Pro</h1>
                <p className="text-sm text-gray-600">Professional Batch Image Processing</p>
              </div>
            </div>

            {settings.show_tips && activeTab === 'processor' && (
              <div className="hidden md:block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Upload up to 100 images for batch processing
                </p>
              </div>
            )}
          </div>
        </div>

        <nav className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="py-8">
        {activeTab === 'processor' && (
          <BatchProcessor
            settings={settings}
            onProcessingComplete={(results, images) => {
              setProcessingResults(results);
              setProcessedImages(images);
            }}
          />
        )}
        {activeTab === 'export' && (
          <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Export & Share</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Export Processed Images</h3>
                  <p className="text-gray-600 mb-4">Export your processed images in various formats including JSON, CSV, XLSX, PDF, and more.</p>
                  <button
                    onClick={() => setShowExportPanel(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Package className="w-5 h-5" />
                    Open Export Panel
                  </button>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Direct Listing & Sharing</h3>
                  <p className="text-gray-600 mb-4">List your items directly on eBay or share on social media platforms.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => alert('eBay listing functionality coming soon!')}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      List on eBay
                    </button>
                    <button
                      onClick={() => alert('Social sharing functionality coming soon!')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                      Share
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ai-config' && (
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">AI Provider Configuration</h2>
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Configure AI Services</h3>
                <p className="text-gray-600 mb-4">
                  Set up your API keys for various AI services including Google Gemini, OpenAI, Anthropic,
                  eBay, and Facebook to enhance your image processing capabilities.
                </p>
                <button
                  onClick={() => setShowAiProviderConfig(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <SettingsIcon className="w-5 h-5" />
                  Configure AI Providers
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">Google Gemini</h4>
                  <p className="text-sm text-gray-600">Advanced image analysis and description</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">OpenAI</h4>
                  <p className="text-sm text-gray-600">GPT-4 Vision for detailed analysis</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">Anthropic</h4>
                  <p className="text-sm text-gray-600">Claude for nuanced descriptions</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ebay-config' && (
          <EbayConfig />
        )}
        {activeTab === 'settings' && (
          <Settings settings={settings} onSettingsChange={setSettings} onThemeChange={handleThemeChange} />
        )}
        {activeTab === 'about' && (
          <div className="max-w-3xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">About Image Pro</h2>

              <div className="space-y-4 text-gray-700">
                <p>
                  Image Pro is a powerful batch image processing platform that allows you to process
                  up to 100 images simultaneously with advanced features.
                </p>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Key Features</h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Batch processing of up to 100 images</li>
                    <li>Automatic image expansion before cropping</li>
                    <li>Intelligent auto-enhancement with brightness, contrast, and saturation adjustments</li>
                    <li>Interactive cropping with visual feedback</li>
                    <li>Grid overlay for precise editing</li>
                    <li>Customizable processing settings</li>
                    <li>Bulk download of processed images</li>
                    <li>AI-powered image analysis for collectibles</li>
                    <li>Smart renaming based on AI analysis</li>
                    <li>Metadata embedding with processing details</li>
                    <li>Export to multiple formats (JSON, PDF, CSV, XLSX)</li>
                    <li>Direct listing on eBay</li>
                    <li>Social media sharing</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">How It Works</h3>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Upload your images (supports common formats: JPG, PNG, etc.)</li>
                    <li>Customize your processing settings in the Settings tab</li>
                    <li>Click "Process All" to apply automatic enhancements</li>
                    <li>Edit individual images with the crop tool</li>
                    <li>AI analyzes your images and provides detailed descriptions</li>
                    <li>Export processed images in various formats</li>
                    <li>List directly on eBay or share on social media</li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Processing Pipeline</h3>
                  <p className="text-blue-700">
                    Images go through an intelligent processing pipeline: expansion (optional) →
                    cropping (manual) → enhancement (automatic) → AI analysis → smart renaming →
                    metadata embedding. All operations are applied client-side for maximum privacy and speed.
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Built with React, TypeScript, and Canvas API for high-performance image processing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <p className="text-center text-sm text-gray-600">
            Image Pro - Professional Batch Image Processing
          </p>
        </div>
      </footer>

      {showExportPanel && (
        <ExportPanel
          results={processingResults}
          images={processedImages}
          onClose={() => setShowExportPanel(false)}
        />
      )}

      {showAiProviderConfig && (
        <AiProviderConfig onClose={() => setShowAiProviderConfig(false)} />
      )}
    </div>
  );
}

export default App;
