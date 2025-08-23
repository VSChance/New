import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useHotkeys } from 'react-hotkeys-hook';
import { useProjectStore } from '@/hooks/useProjectStore';
import {
  FileText,
  Play,
  Plus,
  Save,
  Code,
  Eye,
  Settings,
  Moon,
  Sun
} from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { createNewProject, saveProject } = useProjectStore();

  useHotkeys('cmd+k, ctrl+k', () => setOpen(prev => !prev), {
    enableOnFormTags: true,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleCommand = (action: string) => {
    switch (action) {
      case 'new-project':
        const name = prompt('Enter project name:');
        if (name) createNewProject(name);
        break;
      case 'save-project':
        saveProject();
        break;
      case 'run-test':
        // Trigger test run
        break;
      // Add more command handlers
    }
    setOpen(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-gray-900 shadow-2xl">
        <Command.Input
          placeholder="Type a command or search..."
          className="w-full border-0 bg-transparent px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none"
        />

        <Command.List className="max-h-96 overflow-auto p-2">
          <Command.Empty className="px-4 py-8 text-center text-gray-400">
            No results found
          </Command.Empty>

          <Command.Group heading="Project" className="text-gray-400 text-xs uppercase px-2 py-1">
            <Command.Item
              onSelect={() => handleCommand('new-project')}
              className="flex items-center gap-2 px-2 py-2 text-white rounded hover:bg-gray-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Command.Item>
            <Command.Item
              onSelect={() => handleCommand('save-project')}
              className="flex items-center gap-2 px-2 py-2 text-white rounded hover:bg-gray-800 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save Project
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Testing" className="text-gray-400 text-xs uppercase px-2 py-1 mt-2">
            <Command.Item
              onSelect={() => handleCommand('run-test')}
              className="flex items-center gap-2 px-2 py-2 text-white rounded hover:bg-gray-800 cursor-pointer"
            >
              <Play className="h-4 w-4" />
              Run Test
            </Command.Item>
          </Command.Group>

          <Command.Group heading="View" className="text-gray-400 text-xs uppercase px-2 py-1 mt-2">
            <Command.Item
              onSelect={() => handleCommand('visual-view')}
              className="flex items-center gap-2 px-2 py-2 text-white rounded hover:bg-gray-800 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              Visual View
            </Command.Item>
            <Command.Item
              onSelect={() => handleCommand('code-view')}
              className="flex items-center gap-2 px-2 py-2 text-white rounded hover:bg-gray-800 cursor-pointer"
            >
              <Code className="h-4 w-4" />
              Code View
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Settings" className="text-gray-400 text-xs uppercase px-2 py-1 mt-2">
            <Command.Item
              onSelect={() => handleCommand('toggle-theme')}
              className="flex items-center gap-2 px-2 py-2 text-white rounded hover:bg-gray-800 cursor-pointer"
            >
              <Moon className="h-4 w-4" />
              Toggle Theme
            </Command.Item>
          </Command.Group>
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
