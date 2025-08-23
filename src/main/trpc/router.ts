import { z } from 'zod';
import { initTRPC } from '@trpc/server';
import * as database from '../database';
import { TestingEngineV2 } from '../testing-engine-v2';

const t = initTRPC.create();

const testingEngine = new TestingEngineV2();

export const router = t.router({
  db: t.router({
    getAllProjects: t.procedure.query(async () => {
      return await database.getAllProjects();
    }),

    loadProject: t.procedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        return await database.loadProject(input.projectId);
      }),

    saveProject: t.procedure
      .input(z.object({
        projectId: z.string().optional(),
        name: z.string(),
        projectData: z.any(),
      }))
      .mutation(async ({ input }) => {
        return await database.saveProject(input);
      }),

    deleteProject: t.procedure
      .input(z.object({ projectId: z.string() }))
      .mutation(async ({ input }) => {
        return await database.deleteProject(input.projectId);
      }),
  }),

  test: t.router({
    runConfig: t.procedure
      .input(z.object({
        configScript: z.string(),
        testData: z.array(z.string()),
        proxyData: z.array(z.string()),
        globals: z.record(z.string()).optional(),
        debugMode: z.boolean().optional(),
        concurrency: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await testingEngine.execute(input);
        return { started: true };
      }),

    stop: t.procedure.mutation(async () => {
      testingEngine.stop();
      return { stopped: true };
    }),

    setBreakpoints: t.procedure
      .input(z.array(z.number()))
      .mutation(async ({ input }) => {
        testingEngine.setBreakpoints(input);
        return { set: true };
      }),
  }),

  proxy: t.router({
    getGroups: t.procedure.query(async () => {
      return await database.getProxyGroups();
    }),

    createGroup: t.procedure
      .input(z.object({
        name: z.string(),
        proxies: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        return await database.createProxyGroup(input);
      }),

    addProxies: t.procedure
      .input(z.object({
        groupId: z.string(),
        proxies: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        return await database.addProxiesToGroup(input.groupId, input.proxies);
      }),
  }),
});

export type AppRouter = typeof router;
