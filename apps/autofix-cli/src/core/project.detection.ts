import { z } from 'zod'
import { readFile } from 'fs/promises'
import { join } from 'path'

export type Framework = z.infer<typeof Framework>
export const Framework = z.enum(['astro-ssg', 'astro-ssr', 'remix', 'svelte-ssg', 'svelte-ssr'])

export interface FrameworkDetection {
	framework: Framework
	confidence: 'high' | 'medium' | 'low'
	indicators: string[]
}

export interface PackageJson {
	dependencies?: Record<string, string>
	devDependencies?: Record<string, string>
	scripts?: Record<string, string>
}

export class ProjectDetector {
	/**
	 * Detect all frameworks in the project
	 */
	async detectFrameworks(projectPath: string): Promise<FrameworkDetection[]> {
		const packageJson = await this.readPackageJson(projectPath)
		const allDeps = {
			...(packageJson.dependencies || {}),
			...(packageJson.devDependencies || {}),
		}

		const detections: FrameworkDetection[] = []

		// Detect Astro
		if (allDeps.astro) {
			if (allDeps['@astrojs/cloudflare']) {
				detections.push({
					framework: 'astro-ssr',
					confidence: 'high',
					indicators: ['astro dependency', '@astrojs/cloudflare adapter'],
				})
			} else {
				detections.push({
					framework: 'astro-ssg',
					confidence: 'high',
					indicators: ['astro dependency', 'no SSR adapter'],
				})
			}
		}

		// Detect Remix
		if (Object.keys(allDeps || {}).some(dep => dep.startsWith('@remix-run/'))) {
			detections.push({
				framework: 'remix',
				confidence: 'high',
				indicators: ['@remix-run/ dependencies'],
			})
		}

		// Detect Svelte
		if (allDeps['@sveltejs/kit']) {
			if (allDeps['@sveltejs/adapter-static']) {
				detections.push({
					framework: 'svelte-ssg',
					confidence: 'high',
					indicators: ['@sveltejs/kit dependency', '@sveltejs/adapter-static'],
				})
			} else if (allDeps['@sveltejs/adapter-cloudflare']) {
				detections.push({
					framework: 'svelte-ssr',
					confidence: 'high',
					indicators: ['@sveltejs/kit dependency', '@sveltejs/adapter-cloudflare'],
				})
			} else {
				// Default to SSG if no adapter specified
				detections.push({
					framework: 'svelte-ssg',
					confidence: 'medium',
					indicators: ['@sveltejs/kit dependency', 'no specific adapter'],
				})
			}
		}

		return detections
	}

	/**
	 * Validate that the specified framework matches the project
	 */
	async validateFramework(projectPath: string, framework: Framework): Promise<{
		valid: boolean
		warnings: string[]
	}> {
		try {
			const detections = await this.detectFrameworks(projectPath)
			const detected = detections.find(d => d.framework === framework)

			if (!detected) {
				return {
					valid: false,
					warnings: [
						`${framework} dependencies not found in package.json`,
						`Detected frameworks: ${detections.map(d => d.framework).join(', ')}`,
					],
				}
			}

			return {
				valid: true,
				warnings: detected.confidence === 'low' ? [
					`${framework} detected with low confidence`,
				] : [],
			}
		} catch (error: any) {
			return {
				valid: false,
				warnings: [`Error validating framework: ${error.message}`],
			}
		}
	}

	/**
	 * Read and parse package.json
	 */
	private async readPackageJson(projectPath: string): Promise<PackageJson> {
		try {
			const packageJsonPath = join(projectPath, 'package.json')
			const content = await readFile(packageJsonPath, 'utf-8')
			return JSON.parse(content)
		} catch (error) {
			throw new Error(`Failed to read package.json: ${error}`)
		}
	}
}