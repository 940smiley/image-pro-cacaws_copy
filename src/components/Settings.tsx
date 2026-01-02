import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EbayConfig from 'src/components/EbayConfig';
import { themeManager } from '../lib/themeManager';
import { UserSettings } from '../types';

interface SettingsProps {
  settings: UserSettings | null;
  onSettingsChange: (settings: UserSettings) => void;
  onThemeChange: (theme: Theme) => void;
}

import { Theme } from '../lib/themeManager';
import SourceRepoManager from './SourceRepoManager';

const defaultSettings: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  auto_enhance: true,
  expand_before_crop: true,
  expansion_percentage: 20,
  theme: 'light',
  show_grid: true,
  show_tips: true,
};

export default function Settings({ settings, onSettingsChange, onThemeChange }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings || defaultSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            ...localSettings,
            updated_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (error) throw error;
        if (data) {
          onSettingsChange(data);
        }
      } else {
        onSettingsChange(localSettings as UserSettings);
      }

      themeManager.initializeTheme(localSettings.theme as Theme);
      onThemeChange(localSettings.theme as Theme);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Processing Options</h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div>
                <div className="font-medium text-gray-800">Auto Enhancement</div>
                <div className="text-sm text-gray-600">Automatically enhance images after processing</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.auto_enhance}
                onChange={(e) => setLocalSettings({ ...localSettings, auto_enhance: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div>
                <div className="font-medium text-gray-800">Expand Before Crop</div>
                <div className="text-sm text-gray-600">Add padding around image before cropping</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.expand_before_crop}
                onChange={(e) => setLocalSettings({ ...localSettings, expand_before_crop: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="block">
                <div className="font-medium text-gray-800 mb-2">Expansion Percentage</div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={localSettings.expansion_percentage}
                    onChange={(e) => setLocalSettings({ ...localSettings, expansion_percentage: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    disabled={!localSettings.expand_before_crop}
                  />
                  <span className="text-lg font-semibold text-blue-600 min-w-[3rem] text-right">
                    {localSettings.expansion_percentage}%
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">UI/UX Features</h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div>
                <div className="font-medium text-gray-800">Show Grid Overlay</div>
                <div className="text-sm text-gray-600">Display grid lines in the image editor</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.show_grid}
                onChange={(e) => setLocalSettings({ ...localSettings, show_grid: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div>
                <div className="font-medium text-gray-800">Show Tips</div>
                <div className="text-sm text-gray-600">Display helpful tips and guidance</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.show_tips}
                onChange={(e) => setLocalSettings({ ...localSettings, show_tips: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block">
                <div className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                  {localSettings.theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-blue-600" />
                  ) : localSettings.theme === 'light' ? (
                    <Sun className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Sun className="w-5 h-5 text-blue-600" />
                  )}
                  Theme Preference
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'auto'] as const).map(theme => (
                    <button
                      key={theme}
                      onClick={() => setLocalSettings({ ...localSettings, theme })}
                      className={`py-2 px-3 rounded-lg font-medium transition-colors ${localSettings.theme === theme
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                        }`}
                    >
                      {theme.charAt(0).toUpperCase() + theme.slice(1)}
                    </button>
                  ))}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Source Control</h3>
            <SourceRepoManager />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">eBay API Configuration</h3>
          <EbayConfig />
        </div>

        <div className="border-t pt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">API Integration</h3>
          <p className="text-sm text-blue-800 mb-3">
            AI-powered image analysis and pricing are configured through secure environment variables.
          </p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Gemini AI: Image analysis and object detection</li>
            <li>eBay API: Real-time pricing and listing data</li>
          </ul>
          <p className="text-xs text-blue-700 mt-3">
            API keys are securely managed server-side and never exposed to the client.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
