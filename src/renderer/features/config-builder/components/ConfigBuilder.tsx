import React, { useState } from 'react';
import SplitPane from 'react-split-pane';
import { CodeEditorPanel } from './CodeEditorPanel';
import { VisualBuilderPanel } from './VisualBuilderPanel';
import { VisualRecorder } from '../../visual-recorder';
import { OutputTerminal } from '../../testing/components/OutputTerminal';
import { Camera, Code, Eye, Layers } from 'lucide-react';

export function ConfigBuilder() {
  const [activeView, setActiveView] = useState<'recorder' | 'visual' | 'code' | 'split'>('recorder');

  const viewButtons = [
    { id: 'recorder', label: 'Recorder', icon: Camera },
    { id: 'visual', label: 'Visual', icon: Eye },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'split', label: 'Split', icon: Layers },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* View Toggle */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 flex gap-2">
        {viewButtons.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as any)}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
              activeView === id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <SplitPane
          split="horizontal"
          minSize={100}
          defaultSize="70%"
          paneStyle={{ overflow: 'auto' }}
        >
          {/* Top: Builder/Editor/Recorder */}
          {activeView === 'recorder' && <VisualRecorder />}
          {activeView === 'visual' && <VisualBuilderPanel />}
          {activeView === 'code' && <CodeEditorPanel />}
          {activeView === 'split' && (
            <SplitPane
              split="vertical"
              minSize={200}
              defaultSize="50%"
              paneStyle={{ overflow: 'auto' }}
            >
              <VisualBuilderPanel />
              <CodeEditorPanel />
            </SplitPane>
          )}

          {/* Bottom: Output Terminal */}
          <OutputTerminal />
        </SplitPane>
      </div>
    </div>
  );
}
