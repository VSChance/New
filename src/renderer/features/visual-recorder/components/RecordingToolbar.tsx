import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointerClick,
  Type,
  Navigation,
  Square,
  Circle,
  Crosshair,
  FormInput,
  Link2
} from 'lucide-react';

type RecordingMode = null | 'CLICK' | 'TYPE' | 'HOVER' | 'NAVIGATE';

export function RecordingToolbar() {
  const [mode, setMode] = useState<RecordingMode>(null);
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = (newMode: RecordingMode) => {
    if (mode === newMode) {
      // Stop recording
      setMode(null);
      setIsRecording(false);
      window.electronAPI.send('browser:stop-recording');
    } else {
      // Start recording in new mode
      setMode(newMode);
      setIsRecording(true);
      window.electronAPI.send('browser:start-recording', newMode);
    }
  };

  const recordingModes = [
    { id: 'CLICK', icon: MousePointerClick, label: 'Click', color: 'blue' },
    { id: 'TYPE', icon: Type, label: 'Type', color: 'green' },
    { id: 'HOVER', icon: Navigation, label: 'Hover', color: 'purple' },
    { id: 'NAVIGATE', icon: Link2, label: 'Navigate', color: 'orange' },
  ];

  return (
    <div className="p-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {recordingModes.map((recordMode) => {
            const Icon = recordMode.icon;
            const isActive = mode === recordMode.id;

            return (
              <motion.button
                key={recordMode.id}
                onClick={() => toggleRecording(recordMode.id as RecordingMode)}
                className={`
                  relative flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={16} />
                <span>{recordMode.label}</span>
                {isActive && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.button>
            );
          })}

          <div className="ml-2 h-6 w-px bg-gray-600" />

          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
            onClick={() => window.electronAPI.send('browser:detect-elements')}
          >
            <Crosshair size={16} />
            Smart Detect
          </button>
        </div>

        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2"
            >
              <Circle
                size={12}
                className="text-red-500 fill-red-500 animate-pulse"
              />
              <span className="text-red-400 font-medium text-sm">
                RECORDING: {mode}
              </span>
              <span className="text-gray-400 text-xs">
                (Click on an element to capture)
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Actions */}
      <div className="mt-2 flex items-center gap-2">
        <div className="text-xs text-gray-400">Quick Add:</div>
        <button
          onClick={() => {
            window.electronAPI.send('recorder:quick-add', {
              type: 'REQUEST',
              parameters: { method: 'GET', url: '<CURRENT_URL>' }
            });
          }}
          className="px-2 py-1 text-xs bg-green-600/20 text-green-400 border border-green-600/30 rounded hover:bg-green-600/30"
        >
          + REQUEST
        </button>
        <button
          onClick={() => {
            window.electronAPI.send('recorder:quick-add', {
              type: 'KEYCHECK',
              parameters: { type: 'SUCCESS', keyword: '' }
            });
          }}
          className="px-2 py-1 text-xs bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded hover:bg-yellow-600/30"
        >
          + KEYCHECK
        </button>
        <button
          onClick={() => {
            window.electronAPI.send('recorder:quick-add', {
              type: 'PARSE',
              parameters: { input: '<SOURCE>', type: 'CSS', left: '', right: '', varName: 'RESULT' }
            });
          }}
          className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded hover:bg-blue-600/30"
        >
          + PARSE
        </button>
      </div>
    </div>
  );
}
