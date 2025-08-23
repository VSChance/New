import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useProjectStore } from '@/hooks/useProjectStore';
import { generateLoliScript } from '@/lib/loli-script-generator-v2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { TestStats } from '@/types';
import { trpc } from '@/lib/trpc';

export function TestingPanel() {
  const { projectData } = useProjectStore();
  const [testData, setTestData] = useState('');
  const [proxyGroups, setProxyGroups] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    concurrency: 50,
    debugMode: false,
    proxyGroupId: '',
    retryCount: 3,
    timeout: 30000,
    proxyCooldownMinutes: 5,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState<TestStats | null>(null);

  const runTestMutation = trpc.test.runConfig.useMutation({
    onSuccess: () => {
      setIsRunning(true);
    },
  });

  useEffect(() => {
    loadProxyGroups();

    window.electronAPI.on('test:stats-update', (data: TestStats) => {
      setStats(data);
    });

    window.electronAPI.on('test:run-complete', () => {
      setIsRunning(false);
    });

    return () => {
      window.electronAPI.removeAllListeners('test:stats-update');
      window.electronAPI.removeAllListeners('test:run-complete');
    };
  }, []);

  const loadProxyGroups = async () => {
    const { data } = await trpc.proxy.getGroups.query();
    setProxyGroups(data || []);
  };

  const handleRunTest = async () => {
    if (!projectData || isRunning) return;

    const configScript = generateLoliScript(projectData.steps);
    const testDataLines = testData.split('\n').filter(l => l.trim());

    let proxyData: string[] = [];
    if (settings.proxyGroupId) {
      const group = proxyGroups.find(g => g.id === settings.proxyGroupId);
      proxyData = group?.proxies || [];
    }

    runTestMutation.mutate({
      configScript,
      testData: testDataLines,
      proxyData,
      globals: projectData.globals || {},
      debugMode: settings.debugMode,
      concurrency: settings.concurrency,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col p-4 space-y-4"
    >
      {/* Test Data Input */}
      <div>
        <Label htmlFor="test-data">Test Data</Label>
        <Textarea
          id="test-data"
          value={testData}
          onChange={(e) => setTestData(e.target.value)}
          className="font-mono text-sm"
          placeholder="user1@email.com:password123"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {testData.split('\n').filter(l => l.trim()).length} lines loaded
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="concurrency">Concurrency</Label>
          <Input
            id="concurrency"
            type="number"
            value={settings.concurrency}
            onChange={(e) => setSettings({ ...settings, concurrency: parseInt(e.target.value) })}
            min="1"
            max="200"
          />
        </div>

        <div>
          <Label htmlFor="proxy-group">Proxy Group</Label>
          <Select
            value={settings.proxyGroupId}
            onValueChange={(value) => setSettings({ ...settings, proxyGroupId: value })}
          >
            <SelectTrigger id="proxy-group">
              <SelectValue placeholder="No proxies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No proxies</SelectItem>
              {proxyGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name} ({group.proxies.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="retry-count">Retry Count</Label>
          <Input
            id="retry-count"
            type="number"
            value={settings.retryCount}
            onChange={(e) => setSettings({ ...settings, retryCount: parseInt(e.target.value) })}
            min="0"
            max="10"
          />
        </div>

        <div>
          <Label htmlFor="proxy-cooldown">Proxy Cooldown (min)</Label>
          <Input
            id="proxy-cooldown"
            type="number"
            value={settings.proxyCooldownMinutes}
            onChange={(e) => setSettings({ ...settings, proxyCooldownMinutes: parseInt(e.target.value) })}
            min="1"
            max="60"
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleRunTest}
          disabled={isRunning || !projectData || !testData}
          className="flex-1"
        >
          {isRunning ? 'Running...' : 'Start Test'}
        </Button>
        {isRunning && (
          <Button
            onClick={() => trpc.test.stop.mutate()}
            variant="destructive"
          >
            Stop
          </Button>
        )}
      </div>

      {/* Live Statistics */}
      {stats && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex-1 space-y-3"
        >
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span>{stats.progress.toFixed(1)}%</span>
            </div>
            <Progress value={stats.progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card p-3 rounded-lg"
            >
              <p className="text-xs text-muted-foreground">CPM</p>
              <p className="text-2xl font-bold">{stats.cpm}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-card p-3 rounded-lg"
            >
              <p className="text-xs text-muted-foreground">Checked</p>
              <p className="text-lg">{stats.checked}/{stats.total}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-green-900/20 border border-green-600 p-3 rounded-lg"
            >
              <p className="text-xs text-green-400">Hits</p>
              <p className="text-xl font-bold text-green-400">{stats.hits}</p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-red-900/20 border border-red-600 p-3 rounded-lg"
            >
              <p className="text-xs text-red-400">Fails</p>
              <p className="text-xl font-bold text-red-400">{stats.fails}</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
