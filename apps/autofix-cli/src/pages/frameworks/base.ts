import { z } from 'zod'

export type Warning = z.infer<typeof Warning>
export const Warning = z.object({
	type: z.string(),
	message: z.string(),
	recommendation: z.string().optional(),
	details: z.string().optional(),
})

export type ValidationResult = z.infer<typeof ValidationResult>
export const ValidationResult = z.object({
	config_valid: z.boolean(),
	build_successful: z.boolean(),
	build_output: z.string().optional(),
})

export type FileChange = z.infer<typeof FileChange>
export const FileChange = z.object({
	path: z.string(),
	summary: z.string(),
})

export type MigrationResult = z.infer<typeof MigrationResult>
export const MigrationResult = z.object({
	success: z.boolean(),
	changes: z.object({
		files_created: z.array(FileChange),
		files_modified: z.array(FileChange),
		dependencies_updated: z.array(z.string()),
	}),
	warnings: z.array(Warning),
	validation: ValidationResult,
})

export interface FrameworkHandler {
	migrate(projectPath: string, buildCommand: string, isDryRun?: boolean): Promise<MigrationResult>
}