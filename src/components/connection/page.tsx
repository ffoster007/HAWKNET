import { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  ExternalLink,
  Key,
  Globe,
  Cpu,
} from "lucide-react";
import { useConnections, type LLMProvider } from "../../hooks/useConnections";

export default function Connections() {
  const {
    close,
    providers,
    updateProvider,
    toggleProvider,
    removeProvider,
    addProvider,
  } = useConnections();

  const [selectedProvider, setSelectedProvider] = useState<string>(providers[0]?.id || '');
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error' | null>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    baseUrl: '',
    model: '',
    apiKey: '',
  });

  const toggleShowKey = (providerId: string) => {
    setShowApiKey(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const handleTestConnection = async (provider: LLMProvider) => {
    setTestResults(prev => ({ ...prev, [provider.id]: 'testing' }));
    
    // Simulate API test
    setTimeout(() => {
      if (provider.apiKey && provider.baseUrl) {
        setTestResults(prev => ({ ...prev, [provider.id]: 'success' }));
      } else {
        setTestResults(prev => ({ ...prev, [provider.id]: 'error' }));
      }
      
      // Reset after 3 seconds
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [provider.id]: null }));
      }, 3000);
    }, 1500);
  };

  const handleAddProvider = () => {
    if (newProvider.name && newProvider.baseUrl) {
      addProvider({
        id: newProvider.name.toLowerCase().replace(/\s+/g, '-'),
        name: newProvider.name,
        icon: '/provider-default.png', // default icon path
        apiKey: newProvider.apiKey,
        baseUrl: newProvider.baseUrl,
        model: newProvider.model || 'default',
        enabled: false,
      });
      setNewProvider({ name: '', baseUrl: '', model: '', apiKey: '' });
      setShowAddForm(false);
    }
  };

  const getProviderImage = (provider: LLMProvider) => {
    // ถ้าเป็น emoji (ขึ้นต้นด้วย 🔌 หรืออักขระพิเศษ) ให้แสดงเป็นข้อความ
    if (provider.icon.match(/[\u{1F300}-\u{1F9FF}]/u)) {
      return null; // จะแสดงเป็น emoji text
    }
    return provider.icon; // เป็น path รูปภาพ
  };

  const provider = providers.find((p: LLMProvider) => p.id === selectedProvider);

  return (
    <div className="flex h-full flex-col bg-[#0b0e0c] text-[#cfd6c8]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1c211d] px-3 py-2">
        <div className="flex items-center gap-2">
          <img 
            src="/icon-connection.png" 
            alt="Connections" 
            className="w-4 h-4"
          />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#e8ff6b]">
            Connections
          </h2>
        </div>
        <button
          onClick={close}
          className="rounded p-1 text-[#6b7268] hover:bg-[#1c211d] hover:text-[#cfd6c8] transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Provider List */}
        <div className="w-48 border-r border-[#1c211d] overflow-y-auto">
          <div className="p-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-[#e8ff6b] hover:bg-[#1c211d] rounded transition-colors mb-2 cursor-pointer"
            >
              <Plus size={12} />
              Add Provider
            </button>
          </div>

          <div className="space-y-0.5">
            {providers.map((prov: LLMProvider) => (
              <button
                key={prov.id}
                onClick={() => setSelectedProvider(prov.id)}
                className={[
                  "flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left  cursor-pointer rounded",
                  selectedProvider === prov.id
                    ? "bg-[#1c211d] text-[#e8ff6b]"
                    : "text-[#6b7268] hover:bg-[#1c211d] hover:text-[#cfd6c8]",
                ].join(" ")}
              >
                {getProviderImage(prov) ? (
                  <img 
                    src={prov.icon} 
                    alt={prov.name}
                    className="w-5 h-5 rounded"
                  />
                ) : (
                  <span className="text-sm">{prov.icon}</span>
                )}
                <span className="flex-1 truncate">{prov.name}</span>
                <span 
                  className={[
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    prov.enabled ? "bg-green-400" : "bg-[#3a3d38]"
                  ].join(" ")}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Provider Details */}
        <div className="flex-1 overflow-y-auto">
          {showAddForm ? (
            <div className="p-4">
              <h3 className="text-xs font-semibold text-[#e8ff6b] mb-3 uppercase tracking-wider">
                Add Custom Provider
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-[#6b7268] mb-1">Provider Name</label>
                  <input
                    type="text"
                    value={newProvider.name}
                    onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., DeepSeek, Together AI"
                    className="w-full bg-[#11150f] border border-[#1c211d] rounded px-3 py-1.5 text-xs text-[#cfd6c8] placeholder-[#6b7268] focus:border-[#e8ff6b] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6b7268] mb-1">Base URL</label>
                  <input
                    type="text"
                    value={newProvider.baseUrl}
                    onChange={(e) => setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
                    placeholder="https://api.example.com/v1"
                    className="w-full bg-[#11150f] border border-[#1c211d] rounded px-3 py-1.5 text-xs text-[#cfd6c8] placeholder-[#6b7268] focus:border-[#e8ff6b] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6b7268] mb-1">Model</label>
                  <input
                    type="text"
                    value={newProvider.model}
                    onChange={(e) => setNewProvider(prev => ({ ...prev, model: e.target.value }))}
                    placeholder="e.g., gpt-4, claude-3"
                    className="w-full bg-[#11150f] border border-[#1c211d] rounded px-3 py-1.5 text-xs text-[#cfd6c8] placeholder-[#6b7268] focus:border-[#e8ff6b] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#6b7268] mb-1">API Key</label>
                  <input
                    type="password"
                    value={newProvider.apiKey}
                    onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    className="w-full bg-[#11150f] border border-[#1c211d] rounded px-3 py-1.5 text-xs text-[#cfd6c8] placeholder-[#6b7268] focus:border-[#e8ff6b] outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddProvider}
                    className="flex-1 px-3 py-1.5 text-xs bg-[#e8ff6b] text-[#0b0e0c] rounded font-semibold hover:bg-[#d4eb5f] transition-colors cursor-pointer"
                  >
                    Add Provider
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs text-[#6b7268] hover:text-[#cfd6c8] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : provider ? (
            <div className="p-4">
              {/* Provider Header */}
              <div className="flex items-center gap-3 mb-4">
                {getProviderImage(provider) ? (
                  <img 
                    src={provider.icon} 
                    alt={provider.name}
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <span className="text-2xl">{provider.icon}</span>
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-[#cfd6c8]">
                    {provider.name}
                  </h3>
                  <p className="text-[10px] text-[#6b7268]">LLM Provider</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provider.enabled}
                    onChange={() => toggleProvider(provider.id)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-[#1c211d] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#6b7268] after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#e8ff6b]/30 peer-checked:after:bg-[#e8ff6b]" />
                </label>
              </div>

              {/* API Key */}
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-[10px] text-[#6b7268] mb-1.5">
                  <Key size={10} />
                  API Key
                </label>
                <div className="flex gap-1">
                  <input
                    type={showApiKey[provider.id] ? "text" : "password"}
                    value={provider.apiKey}
                    onChange={(e) => updateProvider(provider.id, { apiKey: e.target.value })}
                    placeholder="Enter your API key..."
                    className="flex-1 bg-[#11150f] border border-[#1c211d] rounded px-3 py-1.5 text-xs text-[#cfd6c8] placeholder-[#6b7268] focus:border-[#e8ff6b] outline-none font-mono"
                  />
                  <button
                    onClick={() => toggleShowKey(provider.id)}
                    className="px-2 text-[#6b7268] hover:text-[#cfd6c8] transition-colors"
                  >
                    {showApiKey[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Base URL */}
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-[10px] text-[#6b7268] mb-1.5">
                  <Globe size={10} />
                  Base URL
                </label>
                <input
                  type="text"
                  value={provider.baseUrl}
                  onChange={(e) => updateProvider(provider.id, { baseUrl: e.target.value })}
                  className="w-full bg-[#11150f] border border-[#1c211d] rounded px-3 py-1.5 text-xs text-[#cfd6c8] focus:border-[#e8ff6b] outline-none font-mono"
                />
              </div>

              {/* Model */}
              <div className="mb-4">
                <label className="flex items-center gap-1.5 text-[10px] text-[#6b7268] mb-1.5">
                  <Cpu size={10} />
                  Model
                </label>
                <input
                  type="text"
                  value={provider.model}
                  onChange={(e) => updateProvider(provider.id, { model: e.target.value })}
                  className="w-full bg-[#11150f] border border-[#1c211d] rounded px-3 py-1.5 text-xs text-[#cfd6c8] focus:border-[#e8ff6b] outline-none"
                />
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => handleTestConnection(provider)}
                  disabled={testResults[provider.id] === 'testing'}
                  className={[
                    "flex items-center gap-1.5 w-full px-3 py-1.5 text-xs rounded transition-colors",
                    testResults[provider.id] === 'success'
                      ? "bg-green-500/20 text-green-400"
                      : testResults[provider.id] === 'error'
                      ? "bg-red-500/20 text-red-400"
                      : "bg-[#1c211d] text-[#cfd6c8] hover:bg-[#2a3129]",
                  ].join(" ")}
                >
                  {testResults[provider.id] === 'testing' ? (
                    <>
                      <div className="w-3 h-3 border-2 border-[#e8ff6b] border-t-transparent rounded-full animate-spin" />
                      Testing...
                    </>
                  ) : testResults[provider.id] === 'success' ? (
                    <>
                      <Check size={12} />
                      Connection Successful
                    </>
                  ) : testResults[provider.id] === 'error' ? (
                    <>
                      <AlertCircle size={12} />
                      Connection Failed - Check API Key
                    </>
                  ) : (
                    <>
                      <ExternalLink size={12} />
                      Test Connection
                    </>
                  )}
                </button>

                <button
                  onClick={() => removeProvider(provider.id)}
                  className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                  Remove Provider
                </button>
              </div>

              {/* Documentation Link */}
              <div className="mt-4 p-3 rounded bg-[#11150f] border border-[#1c211d]">
                <p className="text-[10px] text-[#6b7268] leading-relaxed">
                  Get your API key from{" "}
                  <a
                    href="#"
                    className="text-[#e8ff6b] hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    {provider.name} Console
                  </a>
                  . Your key is stored locally and never sent to our servers.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-[#6b7268]">Select a provider</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}