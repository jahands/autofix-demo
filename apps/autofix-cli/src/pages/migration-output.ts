import { z } from 'zod'
import { Framework } from '../core/project.detection.js'
import { MigrationResult } from './frameworks/base.js'

export type SuccessOutput = z.infer<typeof SuccessOutput>
export const SuccessOutput = z.object({
	status: z.literal('success'),
	framework: Framework,
	changes: z.object({
		files_created: z.array(z.object({
			path: z.string(),
			summary: z.string(),
		})),
		files_modified: z.array(z.object({
			path: z.string(),
			summary: z.string(),
		})),
		dependencies_updated: z.array(z.string()),
	}),
	validation: z.object({
		config_valid: z.boolean(),
		build_successful: z.boolean(),
		build_output: z.string().optional(),
	}),
	warnings: z.array(z.object({
		type: z.string(),
		message: z.string(),
		recommendation: z.string().optional(),
		details: z.string().optional(),
	})),
	summary: z.string(),
})

export type ErrorOutput = z.infer<typeof ErrorOutput>
export const ErrorOutput = z.object({
	status: z.literal('error'),
	error_type: z.string(),
	message: z.string(),
	detected_frameworks: z.array(Framework).optional(),
	recommendation: z.string().optional(),
})

export type MigrationOutput = SuccessOutput | ErrorOutput

export class MigrationOutputFormatter {
	/**
	 * Format successful migration result
	 */
	formatSuccess(framework: Framework, result: MigrationResult): SuccessOutput {
		const summary = this.generateSummary(framework, result)
		
		return {
			status: 'success',
			framework,
			changes: result.changes,
			validation: result.validation,
			warnings: result.warnings,
			summary,
		}
	}

	/**
	 * Format error output
	 */
	formatError(type: string, message: string, options?: {
		detectedFrameworks?: Framework[]
		recommendation?: string
	}): ErrorOutput {
		return {
			status: 'error',
			error_type: type,
			message,
			detected_frameworks: options?.detectedFrameworks,
			recommendation: options?.recommendation,
		}
	}

	/**
	 * Generate summary text for successful migration
	 */
	private generateSummary(framework: Framework, result: MigrationResult): string {
		const actions = []
		
		if (result.changes.files_created.length > 0) {
			actions.push(`created ${result.changes.files_created.length} file(s)`)
		}
		
		if (result.changes.files_modified.length > 0) {
			actions.push(`modified ${result.changes.files_modified.length} file(s)`)
		}
		
		if (result.changes.dependencies_updated.length > 0) {
			actions.push(`updated ${result.changes.dependencies_updated.length} dependency(ies)`)
		}

		const buildStatus = result.validation.build_successful ? 'build passed' : 'build failed'
		const configStatus = result.validation.config_valid ? 'config valid' : 'config issues'
		
		return `Successfully migrated ${framework} project to Workers: ${actions.join(', ')} (${buildStatus}, ${configStatus})`
	}
}