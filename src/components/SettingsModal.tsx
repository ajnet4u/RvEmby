import React, { useState, useEffect } from 'react';
import { ServerSettings } from '../types';
import { X, Server, Key, AlertCircle, CheckCircle2, Loader2, HelpCircle } from 'lucide-react';
import { testEmbyConnection } from '../api/emby';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ServerSettings;
  onSave: (settings: ServerSettings) => void;
}

export function SettingsModal({ isOpen, onClose, currentSettings, onSave }: SettingsModalProps) {
  const [url, setUrl] = useState(currentSettings.url || 'http://192.168.10.146:8096');
  const [apiKey, setApiKey] = useState(currentSettings.apiKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state if currentSettings change
  useEffect(() => {
    if (currentSettings.url) setUrl(currentSettings.url);
    if (currentSettings.apiKey) setApiKey(currentSettings.apiKey);
  }, [currentSettings]);

  if (!isOpen) return null;

  const handleTest = async () => {
    const cleanUrl = url.trim();
    const cleanKey = apiKey.trim();

    if (!cleanUrl) {
      setTestResult({ success: false, message: 'Please enter a server URL.' });
      return;
    }
    if (!cleanKey) {
      setTestResult({ success: false, message: 'Please enter your Emby API key.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testEmbyConnection({ url: cleanUrl, apiKey: cleanKey });
      setTestResult({
        success: true,
        message: `Connected successfully to ${res.serverName} (v${res.version})! Settings saved.`
      });
      // Auto-save immediately upon successful test so user never has to re-type
      onSave({ url: cleanUrl, apiKey: cleanKey });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to reach Emby/Jellyfin server. Check URL, API key, and network/CORS.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClose = () => {
    // If the user entered an API key, automatically preserve it
    if (apiKey.trim()) {
      onSave({ url: url.trim(), apiKey: apiKey.trim() });
    }
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ url: url.trim(), apiKey: apiKey.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-900/95 p-8 shadow-2xl border border-zinc-700/60 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Server size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Emby & Jellyfin Connection</h2>
              <p className="text-xs text-zinc-400">Configure connection to your Emby or Jellyfin media server</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server size={14} className="text-cyan-400" />
                Server Address (IP:Port or Domain)
              </span>
              <span className="text-[11px] text-zinc-500 font-normal">e.g. CasaOS IP or LAN</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://192.168.10.146:8096"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key size={14} className="text-cyan-400" />
                Emby API Key
              </span>
              <span className="text-[11px] text-zinc-500 font-normal">Dashboard &gt; Advanced &gt; API Keys</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="Paste your 32-character API key"
              className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm font-mono"
            />
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div className={`rounded-xl p-3.5 flex items-start gap-3 text-sm border ${
              testResult.success 
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-600/40 text-rose-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="shrink-0 text-emerald-400 mt-0.5" size={18} />
              ) : (
                <AlertCircle className="shrink-0 text-rose-400 mt-0.5" size={18} />
              )}
              <div className="text-xs leading-relaxed">{testResult.message}</div>
            </div>
          )}

          {/* Setup Help */}
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800/80 p-4 space-y-2 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 font-medium text-zinc-200">
              <HelpCircle size={15} className="text-cyan-400" />
              <span>How to get your Emby API Key:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-1">
              <li>Log in to your Emby server (e.g. <span className="text-zinc-300 font-mono">192.168.10.146:8096</span>)</li>
              <li>Click the gear icon (Settings / Server Dashboard)</li>
              <li>Under <strong className="text-zinc-300">Advanced</strong> on the left, click <strong className="text-zinc-300">API Keys</strong></li>
              <li>Click <strong className="text-zinc-300">New API Key</strong>, name it "JEmby", and copy the token</li>
            </ol>
            <div className="pt-1.5 border-t border-zinc-800/60 text-[11px] text-zinc-500">
              Works with both <strong>Emby</strong> and <strong>Jellyfin</strong> servers on CasaOS, TrueNAS, Unraid, or Windows/Linux.
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-cyan-500/50 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {testing ? <Loader2 size={14} className="animate-spin text-cyan-400" /> : <Server size={14} className="text-cyan-400" />}
              Test Connection
            </button>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(8,145,178,0.4)]"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


