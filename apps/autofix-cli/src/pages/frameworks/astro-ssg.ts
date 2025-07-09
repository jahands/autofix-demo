import { z } from 'zod'
import { writeFile, readFile, access, constants } from 'fs/promises'
import { join } from 'path'
import { $ } from 'zx'
import { PackageManagerDetector } from '../../core/package-manager.detection.js'
import { ProjectDetector } from '../../core/project.detection.js'
import { FrameworkHandler, MigrationResult, Warning, FileChange } from './base.js'

export type WranglerConfig = z.infer<typeof WranglerConfig>
export const WranglerConfig = z.object({
	name: z.string(),
	compatibility_date: z.string(),
	pages_build_output_dir: z.string(),
})

export class AstroSSGHandler implements FrameworkHandler {
	private packageManagerDetector = new PackageManagerDetector()
	private projectDetector = new ProjectDetector()

	async migrate(projectPath: string, buildCommand: string): Promise<MigrationResult> {
		const warnings: Warning[] = []
		const filesCreated: FileChange[] = []
		const filesModified: FileChange[] = []
		const dependenciesUpdated: string[] = []

		try {
			// 1. Detect package manager
			const packageManagerResult = await this.packageManagerDetector.detect(projectPath)
			if (!packageManagerResult.available) {
				throw new Error(`Package manager ${packageManagerResult.manager} not found in PATH`)
			}

			// 2. Validate framework
			const frameworkValidation = await this.projectDetector.validateFramework(projectPath, 'astro-ssg')
			if (!frameworkValidation.valid) {
				warnings.push({
					type: 'framework_mismatch',
					message: 'Astro SSG dependencies not found in package.json',
					recommendation: 'Verify project uses Astro SSG',
					details: frameworkValidation.warnings.join(', '),
				})
			}

			// 3. Update wrangler dependency
			const wranglerResult = await this.packageManagerDetector.installWrangler(
				projectPath,
				packageManagerResult.manager
			)
			if (!wranglerResult.success) {
				throw new Error(`Failed to install wrangler: ${wranglerResult.output}`)
			}

			const versionString = wranglerResult.version 
				? `wrangler@${wranglerResult.version} (using ${packageManagerResult.manager})`
				: `wrangler@latest (using ${packageManagerResult.manager})`
			dependenciesUpdated.push(versionString)

			// 4. Generate wrangler.jsonc
			const wranglerConfig = await this.generateWranglerConfig(projectPath)
			const wranglerConfigPath = join(projectPath, 'wrangler.jsonc')
			
			// Check if wrangler config already exists
			let configExists = false
			try {
				await access(wranglerConfigPath, constants.F_OK)
				configExists = true
				
				// Backup existing config
				await $`cd ${projectPath} && cp wrangler.jsonc wrangler.jsonc.backup`
				warnings.push({
					type: 'config_backup',
					message: 'Existing wrangler.jsonc backed up',
					details: 'Backup saved as wrangler.jsonc.backup',
				})
			} catch {
				// Config doesn't exist, which is fine
			}

			await writeFile(wranglerConfigPath, JSON.stringify(wranglerConfig, null, 2))
			
			if (configExists) {
				filesModified.push({
					path: 'wrangler.jsonc',
					summary: 'Updated Astro SSG configuration with pages_build_output_dir set to "dist"',
				})
			} else {
				filesCreated.push({
					path: 'wrangler.jsonc',
					summary: 'Generated Astro SSG configuration with pages_build_output_dir set to "dist"',
				})
			}

			// 5. Validate configuration
			const configValid = await this.validateWranglerConfig(wranglerConfig)
			if (!configValid) {
				warnings.push({
					type: 'config_validation',
					message: 'Generated wrangler.jsonc may have issues',
					recommendation: 'Review configuration manually',
				})
			}

			// 6. Run build validation
			const buildResult = await this.validateBuild(projectPath, buildCommand)

			return {
				success: true,
				changes: {
					files_created: filesCreated,
					files_modified: filesModified,
					dependencies_updated: dependenciesUpdated,
				},
				warnings,
				validation: {
					config_valid: configValid,
					build_successful: buildResult.success,
					build_output: buildResult.output,
				},
			}
		} catch (error: any) {
			// Return error as unsuccessful migration
			return {
				success: false,
				changes: {
					files_created: filesCreated,
					files_modified: filesModified,
					dependencies_updated: dependenciesUpdated,
				},
				warnings: [{
					type: 'migration_error',
					message: error.message,
					recommendation: 'Check error details and try again',
				}],
				validation: {
					config_valid: false,
					build_successful: false,
					build_output: error.toString(),
				},
			}
		}
	}

	/**
	 * Generate wrangler.jsonc configuration for Astro SSG
	 */
	private async generateWranglerConfig(projectPath: string): Promise<WranglerConfig> {
		// Get project name from package.json
		const projectName = await this.getProjectName(projectPath)
		
		return {
			name: projectName,
			compatibility_date: new Date().toISOString().split('T')[0],
			pages_build_output_dir: 'dist',
		}
	}

	/**
	 * Get project name from package.json
	 */
	private async getProjectName(projectPath: string): Promise<string> {
		try {
			const packageJsonPath = join(projectPath, 'package.json')
			const content = await readFile(packageJsonPath, 'utf-8')
			const packageJson = JSON.parse(content)
			return packageJson.name || 'my-astro-app'
		} catch {
			return 'my-astro-app'
		}
	}

	/**
	 * Validate wrangler configuration
	 */
	private async validateWranglerConfig(config: WranglerConfig): Promise<boolean> {
		try {
			WranglerConfig.parse(config)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Run build validation
	 */
	private async validateBuild(projectPath: string, buildCommand: string): Promise<{
		success: boolean
		output: string
	}> {
		try {
			const result = await $`cd ${projectPath} && ${buildCommand}`
			return {
				success: true,
				output: result.stdout + result.stderr,
			}
		} catch (error: any) {
			return {
				success: false,
				output: error.stdout + error.stderr,
			}
		}
	}
}