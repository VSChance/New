import React from 'react';
import { X, Plus, Code, Type, MousePointer } from 'lucide-react';

interface DetectedElement {
  type: 'input' | 'button' | 'link';
  selector: string;
  text?: string;
  name?: string;
  placeholder?: string;
}

interface ElementInspectorProps {
  elements: DetectedElement[];
  onAddElement: (element: DetectedElement) => void;
  onClose: () => void;
}

export function ElementInspector({ elements, onAddElement, onClose }: ElementInspectorProps) {
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'input':
        return <Type size={14} />;
      case 'button':
        return <MousePointer size={14} />;
      default:
        return <Code size={14} />;
    }
  };

  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium">Detected Elements</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {elements.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            Click "Detect Elements" to scan the page
          </div>
        ) : (
          elements.map((element, index) => (
            <div
              key={index}
              className="p-2 bg-gray-700 rounded border border-gray-600 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="mt-0.5">{getElementIcon(element.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 uppercase">{element.type}</div>
                    {element.text && (
                      <div className="text-sm text-white truncate">{element.text}</div>
                    )}
                    {element.name && (
                      <div className="text-xs text-gray-400">name: {element.name}</div>
                    )}
                    {element.placeholder && (
                      <div className="text-xs text-gray-400">placeholder: {element.placeholder}</div>
                    )}
                    <div className="text-xs text-blue-400 font-mono mt-1 break-all">
                      {element.selector}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onAddElement(element)}
                  className="p-1 text-green-400 hover:bg-green-600/20 rounded"
                  title="Add to script"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          {elements.length} elements detected
        </div>
      </div>
    </div>
  );
}
