# Convert Pages to Workers

Convert a Cloudflare Pages project to Workers using autofix-cli.

## Usage

1. **Analyze the project** to determine framework type and build command
2. **Run with dry-run** to preview changes:
   ```bash
   npx autofix-cli@latest pages-to-workers --framework <type> --pages-build-command "<command>" --dry-run
   ```
3. **Execute the conversion**:
   ```bash
   npx autofix-cli@latest pages-to-workers --framework <type> --pages-build-command "<command>"
   ```

## Framework Types
- `astro-ssg` - Currently supported
- `astro-ssr`, `remix`, `svelte-ssg`, `svelte-ssr` - Not yet implemented

## Notes
- Only `astro-ssg` is currently implemented
- Use `--verbose` for detailed output if needed
- The tool will create `wrangler.jsonc` and update dependencies
