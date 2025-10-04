import 'server-only';
import type { ToolResult, ToolContext } from './types';
import { runSqlTool, type SqlToolInput } from './sqlTool';
import { runMetricsTool, type MetricsToolInput } from './metricsTool';
import { runQueryStoreTool, type QueryStoreToolInput } from './queryStoreTool';
import { runIndexInspectorTool, type IndexInspectorInput } from './indexInspectorTool';
import { runDependencyScannerTool, type DependencyScannerInput } from './dependencyScannerTool';
import { runPlanValidatorTool, type PlanValidatorInput } from './planValidatorTool';
import { runPlanExecutorTool, type PlanExecutorInput } from './planExecutorTool';

export type ToolName =
  | 'SqlTool'
  | 'MetricsTool'
  | 'QueryStoreTool'
  | 'IndexInspectorTool'
  | 'DependencyScannerTool'
  | 'PlanValidatorTool'
  | 'PlanExecutorTool';

export async function run(toolName: ToolName, input: unknown, context: ToolContext): Promise<ToolResult> {
  switch (toolName) {
    case 'SqlTool':
      return runSqlTool(input as SqlToolInput, context);
    case 'MetricsTool':
      return runMetricsTool(input as MetricsToolInput, context);
    case 'QueryStoreTool':
      return runQueryStoreTool(input as QueryStoreToolInput, context);
    case 'IndexInspectorTool':
      return runIndexInspectorTool(input as IndexInspectorInput, context);
    case 'DependencyScannerTool':
      return runDependencyScannerTool(input as DependencyScannerInput, context);
    case 'PlanValidatorTool':
      return runPlanValidatorTool(input as PlanValidatorInput, context);
    case 'PlanExecutorTool':
      return runPlanExecutorTool(input as PlanExecutorInput, context);
    default:
      return { ok: false, error: `Unknown tool: ${toolName}` };
  }
}

export type { ToolContext, ToolResult } from './types';
