import React, { useState, useEffect } from 'react';
import { ServerSettings } from '../types';
import { 
  X, 
  Server, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  HelpCircle,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Share2
} from 'lucide-react';
import { testEmbyConnection } from '../api/emby';
import QRCode from 'qrcode';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ServerSettings;
  onSave: (settings: ServerSettings) => void;
  onOpenCodecs?: () => void;
}

export function SettingsModal({ isOpen, onClose, currentSettings, onSave, onOpenCodecs }: SettingsModalProps) {
  const [url, setUrl] = useState(currentSettings.url || 'http://192.168.10.146:8096');
  const [apiKey, setApiKey] = useState(currentSettings.apiKey || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync to new device / QR code state
  const [showSyncSection, setShowSyncSection] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state if currentSettings change
  useEffect(() => {
    if (currentSettings.url) setUrl(currentSettings.url);
    if (currentSettings.apiKey) setApiKey(currentSettings.apiKey);
  }, [currentSettings]);

  // Generate QR code when sync section is open
  useEffect(() => {
    if (showSyncSection && apiKey.trim()) {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const syncUrl = `${origin}${pathname}?server=${encodeURIComponent(url.trim())}&key=${encodeURIComponent(apiKey.trim())}`;
      
      QRCode.toDataURL(syncUrl, {
        width: 200,
        margin: 1.5,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error("QR Code generation error:", err));
    }
  }, [showSyncSection, url, apiKey]);

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

  const handleCopySyncLink = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const syncUrl = `${origin}${pathname}?server=${encodeURIComponent(url.trim())}&key=${encodeURIComponent(apiKey.trim())}`;
    
    navigator.clipboard.writeText(syncUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {});
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
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
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

          {/* Sync with TV / New Device (Quick-Connect & QR Code) */}
          {apiKey.trim() && (
            <div className="rounded-xl bg-zinc-950/70 border border-cyan-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <Smartphone size={16} className="text-cyan-400" />
                  <span>Sync to New Device (Smart TV / Phone)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSyncSection(!showSyncSection)}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  {showSyncSection ? 'Hide QR Code' : 'Show QR & Quick Link'}
                </button>
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Connect any other TV, tablet, or phone instantly without typing your API key manually on the new device.
              </p>

              {showSyncSection && (
                <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center gap-4">
                  {qrDataUrl && (
                    <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                      <img src={qrDataUrl} alt="Quick connect QR code" className="w-32 h-32 block" />
                    </div>
                  )}

                  <div className="space-y-2 flex-1 text-xs">
                    <div className="text-zinc-200 font-medium">How to connect your new device:</div>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                      <li>Scan this QR code with your mobile camera to open JEmby pre-configured.</li>
                      <li>Or copy the Quick-Connect link below and open it in your Smart TV browser.</li>
                      <li>Server settings are automatically shared across your local network.</li>
                    </ul>

                    <button
                      type="button"
                      onClick={handleCopySyncLink}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/50 text-cyan-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedLink ? 'Copied Quick Link!' : 'Copy Quick-Connect Link'}</span>
                    </button>
                  </div>
                </div>
              )}
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

          {onOpenCodecs && (
            <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Want to test hardware codec support?</span>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenCodecs();
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold underline transition-colors cursor-pointer"
              >
                Inspect Device Codecs →
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-cyan-500/50 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {testing ? <Loader2 size={14} className="animate-spin text-cyan-400" /> : <Server size={14} className="text-cyan-400" />}
              Test Connection
            </button>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-all shadow-[0_0_15px_rgba(8,145,178,0.4)] cursor-pointer"
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



