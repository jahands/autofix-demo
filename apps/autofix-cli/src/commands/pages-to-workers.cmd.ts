import { z } from 'zod'
import { Command } from '@commander-js/extra-typings'
import { resolve } from 'path'
import { ProjectDetector, Framework } from '../core/project.detection.js'
import { AstroSSGHandler } from '../pages/frameworks/astro-ssg.js'
import { MigrationOutputFormatter } from '../pages/migration-output.js'

export type PagesToWorkersOptions = z.infer<typeof PagesToWorkersOptions>
export const PagesToWorkersOptions = z.object({
	framework: Framework,
	pagesBuildCommand: z.string(),
	pagesOutputDir: z.string().optional(),
	force: z.boolean().optional(),
	dryRun: z.boolean().optional(),
	verbose: z.boolean().optional(),
})

export function createPagesToWorkersCommand(): Command {
	return new Command('pages-to-workers')
		.description('Migrate a Cloudflare Pages project to Workers')
		.requiredOption('--framework <framework>', 'Framework to migrate', validateFramework)
		.requiredOption('--pages-build-command <command>', 'Build command used by Pages project')
		.option('--pages-output-dir <dir>', 'Pages output directory (when no wrangler config exists)')
		.option('--force', 'Force migration even if multiple frameworks detected')
		.option('--dry-run', 'Preview changes without modifying files')
		.option('--verbose', 'Enable detailed logging')
		.action(async (options) => {
			const projectPath = resolve(process.cwd())
			const detector = new ProjectDetector()
			const formatter = new MigrationOutputFormatter()

			try {
				// Parse and validate options
				const validatedOptions = PagesToWorkersOptions.parse(options)
				
				if (validatedOptions.dryRun) {
					console.log('DRY RUN: No files will be modified')
				}

				if (validatedOptions.verbose) {
					console.log(`Project path: ${projectPath}`)
					console.log(`Framework: ${validatedOptions.framework}`)
					console.log(`Build command: ${validatedOptions.pagesBuildCommand}`)
				}

				// Detect frameworks
				const detectedFrameworks = await detector.detectFrameworks(projectPath)
				
				// Check for multiple frameworks
				if (detectedFrameworks.length > 1 && !validatedOptions.force) {
					const errorOutput = formatter.formatError(
						'framework_conflict',
						'Multiple frameworks detected',
						{
							detectedFrameworks: detectedFrameworks.map(d => d.framework),
							recommendation: 'Re-run with --framework flag and --force option'
						}
					)
					console.log(JSON.stringify(errorOutput, null, 2))
					process.exit(1)
				}

				// For now, only implement Astro SSG
				if (validatedOptions.framework !== 'astro-ssg') {
					const errorOutput = formatter.formatError(
						'framework_not_implemented',
						`Framework ${validatedOptions.framework} is not yet implemented`,
						{
							recommendation: 'Currently only astro-ssg is supported'
						}
					)
					console.log(JSON.stringify(errorOutput, null, 2))
					process.exit(1)
				}

				// Execute migration
				const handler = new AstroSSGHandler()
				const result = await handler.migrate(projectPath, validatedOptions.pagesBuildCommand, validatedOptions.dryRun)

				if (result.success) {
					const successOutput = formatter.formatSuccess(validatedOptions.framework, result)
					console.log(JSON.stringify(successOutput, null, 2))
					process.exit(0)
				} else {
					// Show detailed error information for failed migrations
					if (validatedOptions.verbose) {
						console.error('Migration failed with details:')
						console.error('Warnings:', result.warnings)
						console.error('Validation:', result.validation)
					}
					
					const errorOutput = formatter.formatError(
						'migration_failed',
						'Migration failed',
						{
							recommendation: 'Check error details in validation output'
						}
					)
					console.log(JSON.stringify(errorOutput, null, 2))
					process.exit(1)
				}
			} catch (error: any) {
				const errorOutput = formatter.formatError(
					'unexpected_error',
					error.message,
					{
						recommendation: 'Check command arguments and try again'
					}
				)
				console.log(JSON.stringify(errorOutput, null, 2))
				process.exit(1)
			}
		})
}

function validateFramework(value: string): Framework {
	try {
		return Framework.parse(value)
	} catch {
		throw new Error(`Invalid framework: ${value}. Must be one of: ${Framework.options.join(', ')}`)
	}
}