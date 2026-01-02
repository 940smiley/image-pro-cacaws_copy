import { useState, useEffect } from 'react';
import { Save, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AiProviderConfig {
  id: string;
  user_id: string;
  provider_name: string;
  api_key_encrypted: string;
  model_name: string;
  is_default: boolean;
}

interface AiProviderConfigProps {
  onClose: () => void;
}

export default function AiProviderConfig({ onClose }: AiProviderConfigProps) {
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [editingProvider, setEditingProvider] = useState<AiProviderConfig | null>(null);
  const [newProvider, setNewProvider] = useState({
    provider_name: 'gemini',
    api_key: '',
    model_name: '',
    is_default: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setProviders(data || []);
    } catch (error) {
      console.error('Error loading AI providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = async () => {
    if (!newProvider.api_key.trim()) {
      alert('Please enter an API key');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real implementation, we would encrypt the API key on the client side
      // or send it to a secure endpoint that handles encryption
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .insert({
          user_id: user.id,
          provider_name: newProvider.provider_name,
          api_key_encrypted: newProvider.api_key, // In real app, this should be encrypted
          model_name: newProvider.model_name,
          is_default: newProvider.is_default,
        })
        .select()
        .single();

      if (error) throw error;

      setProviders([...providers, data]);
      setNewProvider({
        provider_name: 'gemini',
        api_key: '',
        model_name: '',
        is_default: false,
      });
    } catch (error) {
      console.error('Error adding AI provider:', error);
      alert('Failed to add AI provider. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProvider = async () => {
    if (!editingProvider) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('ai_provider_configs')
        .update({
          provider_name: editingProvider.provider_name,
          api_key_encrypted: editingProvider.api_key_encrypted,
          model_name: editingProvider.model_name,
          is_default: editingProvider.is_default,
        })
        .eq('id', editingProvider.id);

      if (error) throw error;

      setProviders(providers.map(p => 
        p.id === editingProvider.id ? editingProvider : p
      ));
      setEditingProvider(null);
    } catch (error) {
      console.error('Error updating AI provider:', error);
      alert('Failed to update AI provider. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI provider?')) return;

    try {
      const { error } = await supabase
        .from('ai_provider_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setProviders(providers.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting AI provider:', error);
      alert('Failed to delete AI provider. Please try again.');
    }
  };

  const toggleDefaultProvider = async (id: string) => {
    try {
      // First, set all providers to not default
      await supabase
        .from('ai_provider_configs')
        .update({ is_default: false })
        .neq('id', id);

      // Then set the selected provider as default
      const { error } = await supabase
        .from('ai_provider_configs')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setProviders(providers.map(p => ({
        ...p,
        is_default: p.id === id
      })));
    } catch (error) {
      console.error('Error updating default provider:', error);
      alert('Failed to update default provider. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">AI Provider Configuration</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">AI Provider Configuration</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Add New Provider Form */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Add New AI Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                <select
                  value={newProvider.provider_name}
                  onChange={(e) => setNewProvider({...newProvider, provider_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ebay">eBay API</option>
                  <option value="facebook">Facebook API</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Name (Optional)</label>
                <input
                  type="text"
                  value={newProvider.model_name}
                  onChange={(e) => setNewProvider({...newProvider, model_name: e.target.value})}
                  placeholder="e.g., gemini-pro-vision"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={newProvider.api_key}
                    onChange={(e) => setNewProvider({...newProvider, api_key: e.target.value})}
                    placeholder="Enter your API key"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="md:col-span-2 flex items-center">
                <input
                  type="checkbox"
                  id="new-default"
                  checked={newProvider.is_default}
                  onChange={(e) => setNewProvider({...newProvider, is_default: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="new-default" className="ml-2 block text-sm text-gray-700">
                  Set as default provider
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddProvider}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Add Provider'}
              </button>
            </div>
          </div>

          {/* Existing Providers List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">Configured Providers</h3>
            {providers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No AI providers configured yet.</p>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div key={provider.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-800 capitalize">{provider.provider_name}</h4>
                        <p className="text-sm text-gray-600">Model: {provider.model_name || 'Default'}</p>
                        {provider.is_default && (
                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleDefaultProvider(provider.id)}
                          disabled={provider.is_default}
                          className={`px-3 py-1 text-xs rounded ${
                            provider.is_default
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          {provider.is_default ? 'Default' : 'Set Default'}
                        </button>
                        <button
                          onClick={() => setEditingProvider(provider)}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit Provider Modal */}
          {editingProvider && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Edit Provider</h3>
                  <button
                    onClick={() => setEditingProvider(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                    <select
                      value={editingProvider.provider_name}
                      onChange={(e) => setEditingProvider({...editingProvider, provider_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="ebay">eBay API</option>
                      <option value="facebook">Facebook API</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                    <input
                      type="text"
                      value={editingProvider.model_name}
                      onChange={(e) => setEditingProvider({...editingProvider, model_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={editingProvider.api_key_encrypted}
                        onChange={(e) => setEditingProvider({...editingProvider, api_key_encrypted: e.target.value})}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                      >
                        {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-default"
                      checked={editingProvider.is_default}
                      onChange={(e) => setEditingProvider({...editingProvider, is_default: e.target.checked})}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="edit-default" className="ml-2 block text-sm text-gray-700">
                      Set as default provider
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingProvider(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProvider}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}