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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#000000] p-8 shadow-2xl border border-white/[0.08] max-h-[90vh] overflow-y-auto text-[#E0E0E0]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] flex items-center justify-center text-[#FFFFFF]">
              <Server size={20} />
            </div>
            <div>
              <h2 className="cinema-title text-xl font-bold text-[#FFFFFF] tracking-wide">Emby & Jellyfin Connection</h2>
              <p className="text-xs text-[#9E9E9E]">Configure connection to your Emby or Jellyfin media server</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-[#9E9E9E] hover:text-[#FFFFFF] transition-colors p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer cinema-focus"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#E0E0E0] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server size={14} className="text-[#9E9E9E]" />
                Server Address (IP:Port or Domain)
              </span>
              <span className="text-[11px] text-[#9E9E9E] font-normal">e.g. CasaOS IP or LAN</span>
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://192.168.10.146:8096"
              className="w-full rounded-lg bg-black border border-white/[0.1] px-4 py-3 text-[#FFFFFF] placeholder-[#9E9E9E]/50 focus:outline-none focus:border-white/30 transition-all text-sm font-mono cinema-focus"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#E0E0E0] uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key size={14} className="text-[#9E9E9E]" />
                Emby API Key
              </span>
              <span className="text-[11px] text-[#9E9E9E] font-normal">Dashboard &gt; Advanced &gt; API Keys</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
              placeholder="Paste your 32-character API key"
              className="w-full rounded-lg bg-black border border-white/[0.1] px-4 py-3 text-[#FFFFFF] placeholder-[#9E9E9E]/50 focus:outline-none focus:border-white/30 transition-all text-sm font-mono cinema-focus"
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
            <div className="rounded-xl bg-black border border-white/[0.08] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#FFFFFF]">
                  <Smartphone size={16} className="text-[#9E9E9E]" />
                  <span>Sync to New Device (Smart TV / Phone)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSyncSection(!showSyncSection)}
                  className="text-xs font-medium text-[#E0E0E0] hover:text-[#FFFFFF] underline cursor-pointer cinema-focus"
                >
                  {showSyncSection ? 'Hide QR Code' : 'Show QR & Quick Link'}
                </button>
              </div>

              <p className="text-[11px] text-[#9E9E9E] leading-relaxed">
                Connect any other TV, tablet, or phone instantly without typing your API key manually on the new device.
              </p>

              {showSyncSection && (
                <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row items-center gap-4">
                  {qrDataUrl && (
                    <div className="p-2 bg-white rounded-xl shadow-lg shrink-0">
                      <img src={qrDataUrl} alt="Quick connect QR code" className="w-32 h-32 block" />
                    </div>
                  )}

                  <div className="space-y-2 flex-1 text-xs">
                    <div className="text-[#E0E0E0] font-medium">How to connect your new device:</div>
                    <ul className="list-disc list-inside space-y-1 text-[#9E9E9E] text-[11px]">
                      <li>Scan this QR code with your mobile camera to open JEmby pre-configured.</li>
                      <li>Or copy the Quick-Connect link below and open it in your Smart TV browser.</li>
                      <li>Server settings are automatically shared across your local network.</li>
                    </ul>

                    <button
                      type="button"
                      onClick={handleCopySyncLink}
                      className="mt-2 flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.1] hover:bg-white/[0.18] border border-white/[0.15] text-[#FFFFFF] text-xs font-medium transition-all cursor-pointer cinema-focus"
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
          <div className="rounded-xl bg-black border border-white/[0.06] p-4 space-y-2 text-xs text-[#9E9E9E]">
            <div className="flex items-center gap-1.5 font-medium text-[#E0E0E0]">
              <HelpCircle size={15} className="text-[#9E9E9E]" />
              <span>How to get your Emby API Key:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-[#9E9E9E] pl-1">
              <li>Log in to your Emby server (e.g. <span className="text-[#E0E0E0] font-mono">192.168.10.146:8096</span>)</li>
              <li>Click the gear icon (Settings / Server Dashboard)</li>
              <li>Under <strong className="text-[#E0E0E0]">Advanced</strong> on the left, click <strong className="text-[#E0E0E0]">API Keys</strong></li>
              <li>Click <strong className="text-[#E0E0E0]">New API Key</strong>, name it "JEmby", and copy the token</li>
            </ol>
            <div className="pt-1.5 border-t border-white/[0.06] text-[11px] text-[#9E9E9E]/70">
              Works with both <strong>Emby</strong> and <strong>Jellyfin</strong> servers on CasaOS, TrueNAS, Unraid, or Windows/Linux.
            </div>
          </div>

          {onOpenCodecs && (
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-[#9E9E9E]">Want to test hardware codec support?</span>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onOpenCodecs();
                }}
                className="text-[#FFFFFF] hover:underline font-medium transition-colors cursor-pointer cinema-focus"
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
              className="px-4 py-2.5 rounded-lg border border-white/[0.1] hover:border-white/[0.2] bg-white/[0.06] hover:bg-white/[0.12] text-[#E0E0E0] hover:text-[#FFFFFF] text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer cinema-focus"
            >
              {testing ? <Loader2 size={14} className="animate-spin text-white" /> : <Server size={14} className="text-[#9E9E9E]" />}
              Test Connection
            </button>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 rounded-lg text-[#9E9E9E] hover:text-[#FFFFFF] hover:bg-white/[0.06] transition-colors text-xs font-medium cursor-pointer cinema-focus"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-white/[0.18] hover:bg-white/[0.28] text-[#FFFFFF] border border-white/[0.25] text-xs font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer cinema-focus"
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



