# Convert Pages to Workers

Guide for converting a Cloudflare Pages project to Workers using autofix-cli.

## Key Questions to Ask

### 1. What framework is this project using?
- Check `package.json` dependencies
- Look for `astro`, `@remix-run/*`, `@sveltejs/kit`
- Does it have SSR adapters like `@astrojs/cloudflare`?

### 2. What's the current build process?
- What's the build command in `package.json`?
- Where does the build output go?
- Are there any custom build steps?

### 3. Is this SSG or SSR?
- **Astro SSG**: Has `astro` but no `@astrojs/cloudflare`
- **Astro SSR**: Has both `astro` and `@astrojs/cloudflare`
- **Remix**: Has `@remix-run/*` packages
- **Svelte SSG**: Has `@sveltejs/adapter-static`
- **Svelte SSR**: Has `@sveltejs/adapter-cloudflare`

## Conversion Process

### Step 1: Preview the changes
```bash
npx autofix-cli pages-to-workers --framework <type> --pages-build-command "<command>" --dry-run
```

### Step 2: If preview looks good, run the conversion
```bash
npx autofix-cli pages-to-workers --framework <type> --pages-build-command "<command>"
```

### Step 3: Verify the results
- Check that `wrangler.jsonc` was created
- Ensure the build still works
- Review the generated configuration

## Framework Types
- `astro-ssg` - Static Astro sites
- `astro-ssr` - Server-side rendered Astro (not yet implemented)
- `remix` - Remix applications (not yet implemented)
- `svelte-ssg` - Static SvelteKit sites (not yet implemented)
- `svelte-ssr` - Server-side rendered SvelteKit (not yet implemented)

## Common Issues

**Multiple frameworks detected?**
- Use `--force` flag if you're sure about the framework

**Build command unclear?**
- Check the `scripts` section in `package.json`
- Look for `build`, `build:production`, or similar

**Need more details?**
- Add `--verbose` flag for detailed output

## Success Indicators
- JSON output shows `"status": "success"`
- `wrangler.jsonc` file is created
- Original build command still works
- Config validation passes