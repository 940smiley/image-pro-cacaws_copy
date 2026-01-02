import { useState, useEffect } from 'react';
import { ShoppingBag, Save, Loader, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EbayConfigData {
  appId: string;
  certId: string;
  devId: string;
  authToken: string;
  environment: 'sandbox' | 'production';
}

export default function EbayConfig() {
  const [config, setConfig] = useState<EbayConfigData>({
    appId: '',
    certId: '',
    devId: '',
    authToken: '',
    environment: 'production',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider_name', 'ebay')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        try {
          const parsedConfig = JSON.parse(data.api_key_encrypted);
          setConfig({
            appId: parsedConfig.appId || '',
            certId: parsedConfig.certId || '',
            devId: parsedConfig.devId || '',
            authToken: parsedConfig.authToken || '',
            environment: parsedConfig.environment || 'production',
          });
        } catch {
          // Fallback if it's not JSON
          setConfig(prev => ({ ...prev, authToken: data.api_key_encrypted }));
        }
      }
    } catch (error) {
      console.error('Error loading eBay config:', error);
      setStatus({ type: 'error', message: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatus(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const configString = JSON.stringify(config);

      const { data: existing } = await supabase
        .from('ai_provider_configs')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_name', 'ebay')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('ai_provider_configs')
          .update({
            api_key_encrypted: configString,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_provider_configs')
          .insert({
            user_id: user.id,
            provider_name: 'ebay',
            api_key_encrypted: configString,
            is_default: false,
          });
        if (error) throw error;
      }

      setStatus({ type: 'success', message: 'eBay configuration saved successfully' });
    } catch (error) {
      console.error('Error saving eBay config:', error);
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 p-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">eBay API Configuration</h2>
              <p className="text-blue-100">Configure your eBay Developer credentials for automatic listings</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {status && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
              {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p>{status.message}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Environment</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="environment"
                    checked={config.environment === 'production'}
                    onChange={() => setConfig({ ...config, environment: 'production' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Production</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="environment"
                    checked={config.environment === 'sandbox'}
                    onChange={() => setConfig({ ...config, environment: 'sandbox' })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700">Sandbox</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">App ID (Client ID)</label>
              <input
                type="text"
                value={config.appId}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                placeholder="e.g., YourName-AppName-PRD-..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dev ID</label>
              <input
                type="text"
                value={config.devId}
                onChange={(e) => setConfig({ ...config, devId: e.target.value })}
                placeholder="Developer ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cert ID (Client Secret)</label>
              <input
                type="password"
                value={config.certId}
                onChange={(e) => setConfig({ ...config, certId: e.target.value })}
                placeholder="Client Secret"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Auth Token (OAuth User Token)</label>
              <div className="relative">
                <textarea
                  value={config.authToken}
                  onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                  placeholder="v^1.1#i^1#f^0#p^3#r^1#I^3#..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                You can obtain this token from your eBay Developer Portal under "User Tokens".
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {saving ? <Loader className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save eBay Configuration
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Setup Instructions
        </h3>
        <ul className="list-disc list-inside space-y-2 text-amber-700 text-sm">
          <li>Create an account at <a href="https://developer.ebay.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">developer.ebay.com</a></li>
          <li>Generate a "Production" or "Sandbox" keyset to get your <strong>App ID</strong>, <strong>Dev ID</strong>, and <strong>Cert ID</strong>.</li>
          <li>Go to "User Tokens" to generate an <strong>Auth Token</strong> (OAuth token).</li>
          <li>Ensure you have configured the correct scopes, including <code>https://api.ebay.com/oauth/api_scope/sell.inventory</code>.</li>
        </ul>
      </div>
    </div>
  );
}
