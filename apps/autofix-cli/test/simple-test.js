#!/usr/bin/env node
import { execSync } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const cliPath = join(__dirname, '../dist/autofix-cli.cmd.cjs')
const testFixturePath = join(__dirname, 'fixtures/astro-ssg')

console.log('Testing autofix-cli with Astro SSG fixture...')

try {
	// Test dry-run mode
	const output = execSync(
		`cd ${testFixturePath} && node ${cliPath} pages-to-workers --framework astro-ssg --pages-build-command "bun run build" --dry-run`,
		{
			encoding: 'utf8',
		}
	)

	const lines = output.split('\n')
	const jsonStartIndex = lines.findIndex((line) => line.startsWith('{'))
	const jsonLines = lines.slice(jsonStartIndex)
	const jsonStr = jsonLines.join('\n').trim()
	const result = JSON.parse(jsonStr)

	console.log('✅ CLI executed successfully')
	console.log('✅ Framework:', result.framework)
	console.log('✅ Status:', result.status)
	console.log('✅ Files to create:', result.changes.files_created.length)
	console.log('✅ Dependencies to update:', result.changes.dependencies_updated.length)
	console.log('✅ Config valid:', result.validation.config_valid)
	console.log('✅ Build successful:', result.validation.build_successful)

	// Verify expected output structure
	if (
		result.framework === 'astro-ssg' &&
		result.status === 'success' &&
		result.changes.files_created.length === 1 &&
		result.changes.files_created[0].path === 'wrangler.jsonc'
	) {
		console.log('🎉 All tests passed!')
	} else {
		console.log("❌ Output structure doesn't match expected format")
		process.exit(1)
	}
} catch (error) {
	console.error('❌ Test failed:', error.message)
	process.exit(1)
}
