import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Shield,
  Lock,
  Globe
} from 'lucide-react';

interface NavigationBarProps {
  url: string;
  isLoading: boolean;
  onUrlChange: (url: string) => void;
  onNavigate: (url?: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onHome: () => void;
}

export function NavigationBar({
  url,
  isLoading,
  onUrlChange,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onHome,
}: NavigationBarProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const isSecure = url.startsWith('https://');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = inputUrl;
    if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
      finalUrl = 'https://' + inputUrl;
    }
    onUrlChange(finalUrl);
    onNavigate(finalUrl);
  };

  return (
    <div className="p-2 bg-gray-800 border-b border-gray-700">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Go Back"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={onForward}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Go Forward"
        >
          <ArrowRight size={18} />
        </button>
        <button
          type="button"
          onClick={onReload}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Reload"
        >
          <RotateCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
        <button
          type="button"
          onClick={onHome}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          title="Home"
        >
          <Home size={18} />
        </button>

        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-md">
          {isSecure ? (
            <Lock size={14} className="text-green-400" title="Secure" />
          ) : (
            <Globe size={14} className="text-gray-400" />
          )}
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm outline-none"
            placeholder="Enter URL..."
          />
        </div>

        <button
          type="submit"
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          Go
        </button>
      </form>
    </div>
  );
}
