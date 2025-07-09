# Pages to Workers Migration Prompt

Use this prompt to guide an LLM through migrating a Cloudflare Pages project to Cloudflare Workers using the autofix-cli tool.

## Instructions for LLM

You are helping migrate a Cloudflare Pages project to Cloudflare Workers. Follow these steps precisely:

### Step 1: Project Analysis
First, analyze the current project structure:

1. **Check the current directory structure**
   - Look for `package.json`, `astro.config.mjs`, build output directories
   - Identify the framework being used

2. **Examine package.json dependencies**
   - Look for framework-specific dependencies (e.g., `astro`, `@remix-run/*`, `@sveltejs/kit`)
   - Check for existing SSR adapters like `@astrojs/cloudflare`

3. **Identify the build command**
   - Find the build script in `package.json`
   - Note the current build command (e.g., `npm run build`, `bun run build`)

### Step 2: Determine Framework Type
Based on your analysis, determine the framework type:

- **Astro SSG**: Has `astro` dependency but NO `@astrojs/cloudflare` adapter
- **Astro SSR**: Has both `astro` and `@astrojs/cloudflare` dependencies
- **Remix**: Has any `@remix-run/*` dependencies
- **Svelte SSG**: Has `@sveltejs/kit` and `@sveltejs/adapter-static`
- **Svelte SSR**: Has `@sveltejs/kit` and `@sveltejs/adapter-cloudflare`

### Step 3: Run Migration (Dry-Run First)
Always start with a dry-run to preview changes:

```bash
npx autofix-cli pages-to-workers --framework <framework-type> --pages-build-command "<build-command>" --dry-run --verbose
```

**Replace:**
- `<framework-type>`: One of `astro-ssg`, `astro-ssr`, `remix`, `svelte-ssg`, `svelte-ssr`
- `<build-command>`: The exact build command from package.json (e.g., `npm run build`)

### Step 4: Review Dry-Run Output
Examine the JSON output from the dry-run:

1. **Check status**: Must be `"success"`
2. **Review changes**: 
   - `files_created`: Should include `wrangler.jsonc`
   - `dependencies_updated`: Should include `wrangler@latest`
3. **Verify validation**:
   - `config_valid`: Should be `true`
   - `build_successful`: Should be `true` (or skipped in dry-run)

### Step 5: Execute Migration
If dry-run looks good, run the actual migration:

```bash
npx autofix-cli pages-to-workers --framework <framework-type> --pages-build-command "<build-command>" --verbose
```

### Step 6: Verify Migration Results
After migration:

1. **Check generated files**:
   - `wrangler.jsonc` should exist with proper configuration
   - Original files should be preserved

2. **Verify wrangler.jsonc contents**:
   - For Astro SSG: Should have `pages_build_output_dir: "dist"`
   - For SSR frameworks: Should have `main` entry point
   - Should have current `compatibility_date`

3. **Test the build**:
   - Run the original build command to ensure it still works
   - Check that output directory matches wrangler config

### Step 7: Next Steps (Manual)
After successful migration, guide the user through:

1. **Deploy to Workers**:
   ```bash
   npx wrangler deploy
   ```

2. **Update CI/CD**:
   - Change deployment from Pages to Workers
   - Update environment variables if needed

3. **Test the deployed application**:
   - Verify all routes work correctly
   - Check that assets are served properly

## Error Handling

If migration fails:

1. **Check error type** in JSON output
2. **Common issues**:
   - `framework_conflict`: Multiple frameworks detected - use `--force` flag
   - `migration_failed`: Check verbose output for specific error
   - Package manager not found: Ensure npm/yarn/pnpm/bun is installed

3. **Retry with flags**:
   - Add `--force` for framework conflicts
   - Add `--verbose` for detailed error information

## Example Workflow

For an Astro SSG project:

```bash
# 1. Analyze project (you do this by reading files)
# 2. Identify as Astro SSG (astro dependency, no SSR adapter)
# 3. Run dry-run
npx autofix-cli pages-to-workers --framework astro-ssg --pages-build-command "npm run build" --dry-run --verbose

# 4. If successful, run migration
npx autofix-cli pages-to-workers --framework astro-ssg --pages-build-command "npm run build" --verbose

# 5. Verify wrangler.jsonc was created
# 6. Test build still works
npm run build

# 7. Deploy to Workers
npx wrangler deploy
```

## Important Notes

- Currently only `astro-ssg` is implemented (other frameworks will show "not yet implemented")
- The tool preserves existing files and creates backups of modified configs
- Build validation may fail due to network issues but won't prevent migration
- The tool detects package manager automatically from lock files
- Always review the generated `wrangler.jsonc` before deploying

## Success Criteria

Migration is successful when:
- ✅ CLI returns `"status": "success"`
- ✅ `wrangler.jsonc` is created with correct configuration
- ✅ Original build command still works
- ✅ `npx wrangler deploy` works without errors
- ✅ Deployed application serves correctly