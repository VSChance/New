import React, { useState, memo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useProjectStore } from '@/hooks/useProjectStore';
import { LoliScriptBlock } from './LoliScriptBlock';
import { Button } from '@/components/ui/button';
import { ActionStep } from '@/types';

export const VisualBuilderPanel = memo(() => {
  const { projectData, reorderSteps, addStep } = useProjectStore();
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: projectData?.steps.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderSteps(result.source.index, result.destination.index);
  };

  const handleAddBlock = (type: ActionStep['type']) => {
    const newStep: ActionStep = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      parameters: getDefaultParameters(type),
    };
    addStep(newStep);
  };

  const getDefaultParameters = (type: ActionStep['type']): Record<string, any> => {
    const defaults: Record<ActionStep['type'], Record<string, any>> = {
      REQUEST: { method: 'GET', url: '', headers: {} },
      PARSE: { input: '<SOURCE>', type: 'LR', left: '', right: '', varName: 'PARSED' },
      KEYCHECK: { type: 'SUCCESS', keyword: '' },
      SET: { varName: '', value: '' },
      FUNCTION: { function: 'SHA256', input: '', varName: 'RESULT' },
      SOLVECAPTCHA: { service: '2CAPTCHA', apiKey: '', siteKey: '', pageUrl: '', varName: 'CAPTCHA_TOKEN' },
      BROWSER: { action: 'GOTO', url: '', selector: '', value: '' },
      IF: { condition: { left: '', op: '==', right: '' } },
    };
    return defaults[type];
  };

  if (!projectData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-full text-gray-400"
      >
        <div className="text-center">
          <p className="mb-4">Select or create a project to start building</p>
          <Button>Create New Project</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Toolbar with animation */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-3 bg-gray-800 border-b border-gray-700"
      >
        <div className="flex flex-wrap gap-2">
          {['REQUEST', 'PARSE', 'KEYCHECK', 'SET', 'FUNCTION', 'SOLVECAPTCHA', 'BROWSER', 'IF'].map((type) => (
            <motion.div
              key={type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                size="sm"
                variant={type === 'REQUEST' ? 'default' : 'secondary'}
                onClick={() => handleAddBlock(type as ActionStep['type'])}
              >
                + {type}
              </Button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Virtualized Blocks List */}
      <div ref={parentRef} className="flex-1 overflow-auto p-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="steps">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                <AnimatePresence>
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const step = projectData.steps[virtualItem.index];
                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        style={{
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        className="absolute top-0 left-0 w-full"
                      >
                        <Draggable draggableId={step.id} index={virtualItem.index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <LoliScriptBlock
                                step={step}
                                index={virtualItem.index}
                                isDragging={snapshot.isDragging}
                                isSelected={selectedBlock === step.id}
                                onSelect={() => setSelectedBlock(step.id)}
                              />
                            </div>
                          )}
                        </Draggable>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
});

VisualBuilderPanel.displayName = 'VisualBuilderPanel';
