import { z } from 'zod'
import { access, constants } from 'fs/promises'
import { join } from 'path'
import { $ } from 'zx'

export type PackageManager = z.infer<typeof PackageManager>
export const PackageManager = z.enum(['pnpm', 'yarn', 'npm', 'bun'])

export interface PackageManagerDetectionResult {
	manager: PackageManager
	lockFile?: string
	available: boolean
}

export class PackageManagerDetector {
	private static readonly LOCK_FILE_MAP = {
		'pnpm-lock.yaml': 'pnpm' as const,
		'yarn.lock': 'yarn' as const,
		'package-lock.json': 'npm' as const,
		'bun.lockb': 'bun' as const,
	}

	/**
	 * Detect the package manager used in the project
	 */
	async detect(projectPath: string): Promise<PackageManagerDetectionResult> {
		// Check for lock files
		for (const [lockFile, manager] of Object.entries(this.LOCK_FILE_MAP)) {
			const lockPath = join(projectPath, lockFile)
			try {
				await access(lockPath, constants.F_OK)
				const available = await this.isManagerAvailable(manager)
				return {
					manager,
					lockFile,
					available,
				}
			} catch {
				// Lock file doesn't exist, continue
			}
		}

		// Fallback to npm
		const available = await this.isManagerAvailable('npm')
		return {
			manager: 'npm',
			available,
		}
	}

	/**
	 * Check if a package manager is available in the system PATH
	 */
	private async isManagerAvailable(manager: PackageManager): Promise<boolean> {
		try {
			await $`${manager} --version`
			return true
		} catch {
			return false
		}
	}

	/**
	 * Install wrangler using the detected package manager
	 */
	async installWrangler(projectPath: string, manager: PackageManager): Promise<{
		success: boolean
		output: string
		version?: string
	}> {
		const commands = {
			pnpm: 'pnpm add wrangler@latest',
			yarn: 'yarn add wrangler@latest',
			npm: 'npm install wrangler@latest',
			bun: 'bun add wrangler@latest',
		}

		try {
			const result = await $`cd ${projectPath} && ${commands[manager]}`
			const output = result.stdout + result.stderr
			
			// Try to get the installed version
			let version: string | undefined
			try {
				const versionResult = await $`cd ${projectPath} && ${manager} list wrangler`
				version = this.extractVersionFromOutput(versionResult.stdout)
			} catch {
				// Version detection failed, not critical
			}

			return {
				success: true,
				output,
				version,
			}
		} catch (error: any) {
			return {
				success: false,
				output: error.stdout + error.stderr,
			}
		}
	}

	/**
	 * Extract version from package manager output
	 */
	private extractVersionFromOutput(output: string): string | undefined {
		const versionMatch = output.match(/wrangler@(\d+\.\d+\.\d+)/)
		return versionMatch?.[1]
	}
}