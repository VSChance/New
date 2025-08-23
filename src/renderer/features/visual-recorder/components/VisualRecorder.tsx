import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '@/hooks/useProjectStore';
import { ActionStep } from '@/types';
import { RecordingToolbar } from './RecordingToolbar';
import { NavigationBar } from './NavigationBar';
import { ElementInspector } from './ElementInspector';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Camera,
  Code,
  Eye
} from 'lucide-react';

export function VisualRecorder() {
  const viewRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState('https://quotes.toscrape.com');
  const [isLoading, setIsLoading] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [detectedElements, setDetectedElements] = useState<any[]>([]);
  const { addStep, projectData } = useProjectStore();

  useEffect(() => {
    // Create BrowserView when component mounts
    window.electronAPI.send('browser:create');

    // Set up resize observer to keep BrowserView positioned correctly
    const resizeObserver = new ResizeObserver(() => {
      if (viewRef.current) {
        const rect = viewRef.current.getBoundingClientRect();
        window.electronAPI.send('browser:set-bounds', {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    });

    if (viewRef.current) {
      resizeObserver.observe(viewRef.current);

      // Initial bounds setting
      const rect = viewRef.current.getBoundingClientRect();
      window.electronAPI.send('browser:set-bounds', {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }

    // Listen for captured actions
    const handleActionCaptured = (action: any) => {
      const newStep: ActionStep = {
        id: `${Date.now()}-${Math.random()}`,
        type: action.type,
        parameters: action.parameters,
      };

      addStep(newStep);

      // Show success notification
      showNotification(`Added ${action.type} action to script`);
    };

    // Listen for navigation events
    const handleNavigation = (data: { url: string }) => {
      setUrl(data.url);
      setIsLoading(false);
    };

    // Listen for errors
    const handleError = (error: any) => {
      console.error('Browser error:', error);
      setIsLoading(false);
    };

    window.electronAPI.on('recorder:action', handleActionCaptured);
    window.electronAPI.on('browser:navigation', handleNavigation);
    window.electronAPI.on('browser:error', handleError);

    // Initial navigation
    handleNavigate();

    return () => {
      resizeObserver.disconnect();
      window.electronAPI.send('browser:destroy');
      window.electronAPI.removeAllListeners('recorder:action');
      window.electronAPI.removeAllListeners('browser:navigation');
      window.electronAPI.removeAllListeners('browser:error');
    };
  }, []);

  const handleNavigate = (targetUrl?: string) => {
    const finalUrl = targetUrl || url;
    setIsLoading(true);
    window.electronAPI.send('browser:navigate', finalUrl);
  };

  const handleBack = () => {
    window.electronAPI.send('browser:back');
  };

  const handleForward = () => {
    window.electronAPI.send('browser:forward');
  };

  const handleReload = () => {
    setIsLoading(true);
    window.electronAPI.send('browser:reload');
  };

  const handleHome = () => {
    setUrl('https://quotes.toscrape.com');
    handleNavigate('https://quotes.toscrape.com');
  };

  const handleScreenshot = async () => {
    const screenshot = await window.electronAPI.invoke('browser:screenshot');
    if (screenshot) {
      // Add screenshot as a comment in the script
      const newStep: ActionStep = {
        id: `${Date.now()}-${Math.random()}`,
        type: 'COMMENT',
        parameters: {
          text: `Screenshot captured at ${new Date().toLocaleString()}`,
          screenshot: screenshot
        },
      };
      addStep(newStep);
      showNotification('Screenshot captured');
    }
  };

  const handleDetectElements = async () => {
    const elements = await window.electronAPI.invoke('browser:detect-elements');
    setDetectedElements(elements);
    setShowInspector(true);
  };

  const showNotification = (message: string) => {
    // Could implement a toast notification system here
    console.log('Notification:', message);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Navigation Bar */}
      <NavigationBar
        url={url}
        isLoading={isLoading}
        onUrlChange={setUrl}
        onNavigate={handleNavigate}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        onHome={handleHome}
      />

      {/* Recording Toolbar */}
      <RecordingToolbar />

      {/* Additional Tools Bar */}
      <div className="px-2 py-1 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
        <button
          onClick={handleScreenshot}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          title="Capture Screenshot"
        >
          <Camera size={14} />
          Screenshot
        </button>
        <button
          onClick={handleDetectElements}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          title="Detect Elements"
        >
          <Eye size={14} />
          Detect Elements
        </button>
        <button
          onClick={() => setShowInspector(!showInspector)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          title="Toggle Inspector"
        >
          <Code size={14} />
          Inspector
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative">
        {/* BrowserView Container */}
        <div className="flex-1 relative">
          <div ref={viewRef} className="absolute inset-0 bg-black" />

          {/* Loading Overlay */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-600 border-t-blue-500" />
                  <span className="text-white">Loading...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Element Inspector Panel */}
        <AnimatePresence>
          {showInspector && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-gray-800 border-l border-gray-700 overflow-hidden"
            >
              <ElementInspector
                elements={detectedElements}
                onAddElement={(element) => {
                  const newStep: ActionStep = {
                    id: `${Date.now()}-${Math.random()}`,
                    type: 'BROWSER',
                    parameters: {
                      action: element.type === 'input' ? 'TYPE' : 'CLICK',
                      selector: element.selector,
                      value: element.type === 'input' ? '<USER>' : undefined,
                    },
                  };
                  addStep(newStep);
                  showNotification(`Added ${element.type} to script`);
                }}
                onClose={() => setShowInspector(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="px-3 py-1 bg-gray-900 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Globe size={12} />
            {url}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>{projectData?.steps.length || 0} steps recorded</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Ready
          </span>
        </div>
      </div>
    </div>
  );
}
