# autofix-cli Technical Specification

## Overview

The autofix-cli is a Node.js CLI tool built with Commander.js that automates the conversion of Cloudflare Pages projects to Cloudflare Workers. It performs deterministic configuration changes and provides structured feedback to AI agents.

## Architecture

### Core Technologies

- **Commander.js**: CLI argument parsing and command structure
- **zx**: Shell utilities for file operations and process execution
- **Zod 4**: Runtime validation for configurations and inputs
- **TypeScript**: Type safety and development experience

### Project Structure

```
apps/autofix-cli/
├── src/
│   ├── bin/
│   │   └── autofix-cli.cmd.ts         # CLI entry point
│   ├── commands/
│   │   └── pages-to-workers.cmd.ts    # Main migration command
│   ├── frameworks/
│   │   ├── astro-ssg.ts               # Astro SSG handler
│   │   ├── astro-ssr.ts               # Astro SSR handler
│   │   ├── remix.ts                   # Remix handler
│   │   ├── svelte-ssg.ts              # Svelte SSG handler
│   │   └── svelte-ssr.ts              # Svelte SSR handler
│   ├── core/
│   │   ├── project-detection.ts       # Framework detection logic
│   │   ├── wrangler-config.ts         # Wrangler configuration generation
│   │   ├── validation.ts              # Configuration validation
│   │   └── output.ts                  # Structured output formatting
```

## Command Interface

### Primary Command

```bash
npx autofix-cli pages-to-workers --framework <framework> [options]
```

### Arguments and Options

- `--framework <framework>`: Required. One of `astro-ssg`, `astro-ssr`, `remix`, `svelte-ssg`, `svelte-ssr`
- `--pages-output-dir <dir>`: Optional. Specify Pages output directory when no wrangler config exists
- `--force`: Optional. Force migration even if multiple frameworks are detected
- `--dry-run`: Optional. Preview changes without modifying files
- `--verbose`: Optional. Enable detailed logging

### Exit Codes

- `0`: Success
- `1`: Error (see stdout for detailed information)

## Core Functionality

### 1. Framework Detection and Validation

#### Detection Logic

```typescript
interface FrameworkDetection {
  framework: string
  confidence: 'high' | 'medium' | 'low'
  indicators: string[]
}
```

**Detection Rules:**

- **Astro SSG**: `@astrojs/cloudflare` NOT in dependencies, `astro` in dependencies
- **Astro SSR**: `@astrojs/cloudflare` and `astro` in dependencies
- **Remix**: Any `@remix-run/` dependency present
- **Svelte SSG**: `@sveltejs/kit` in dependencies, `@sveltejs/adapter-static` in dependencies
- **Svelte SSR**: `@sveltejs/kit` in dependencies, `@sveltejs/adapter-cloudflare` in dependencies

#### Validation Process

1. Parse `package.json` dependencies
2. Run framework detection for all supported frameworks
3. If multiple frameworks detected without `--force`:
   - Exit with code 2
   - Output detected frameworks for LLM decision
4. If specified framework not detected:
   - Log warning but continue
   - Include warning in output summary

### 2. Configuration Generation

#### Wrangler Configuration

Generate `wrangler.jsonc` based on framework requirements:

```typescript
interface WranglerConfig {
  name: string
  main?: string
  compatibility_date: string
  compatibility_flags?: string[]
  pages_build_output_dir?: string
  [key: string]: any
}
```

**Framework-Specific Configs:**

- **Astro SSG**: `pages_build_output_dir: "dist"`
- **Astro SSR**: `main: "dist/server/entry.mjs"`, compatibility flags
- **Remix**: `main: "build/index.js"`, compatibility flags
- **Svelte**: `main: "build/index.js"`, compatibility flags

#### Configuration Validation

1. Validate against wrangler JSON schema from `node_modules/wrangler/config-schema.json`
2. Check for conflicting existing configurations
3. Validate required fields are present

### 3. Package.json Updates

#### Script Modifications

Framework-specific script updates:

**Astro SSG:**

```json
{
  "scripts": {
    "postbuild": "wrangler pages functions build"
  }
}
```

**Astro SSR:**

```json
{
  "scripts": {
    "build": "astro build",
    "deploy": "wrangler deploy"
  }
}
```

**Remix:**

```json
{
  "scripts": {
    "build": "remix build",
    "deploy": "wrangler deploy"
  }
}
```

#### Dependency Updates

- Update `wrangler` to latest version
- Log version changes in output

### 4. Build Validation

#### Process

1. Execute `npm run build` (or equivalent build script)
2. Capture stdout/stderr
3. Check exit code
4. Include results in output summary

#### Failure Handling

- Build failures are non-fatal (exit code 4)
- Include build output in summary for LLM analysis
- Continue with other validation steps

## Output Format

### Success Output

```json
{
  "status": "success",
  "framework": "astro-ssr",
  "changes": {
    "files_created": ["wrangler.jsonc"],
    "files_modified": ["package.json"],
    "dependencies_updated": ["wrangler@3.x.x"]
  },
  "validation": {
    "config_valid": true,
    "build_successful": true,
    "build_output": "..."
  },
  "warnings": [],
  "summary": "Successfully migrated Astro SSR project to Workers"
}
```

### Error Output

```json
{
  "status": "error",
  "error_type": "framework_conflict",
  "message": "Multiple frameworks detected",
  "detected_frameworks": ["astro-ssr", "remix"],
  "recommendation": "Re-run with --framework flag and --force option"
}
```

### Warning Output

```json
{
  "status": "success",
  "framework": "astro-ssr",
  "warnings": [
    {
      "type": "dependency_mismatch",
      "message": "Astro SSR dependencies not found in package.json",
      "recommendation": "Verify project uses specified framework"
    },
    {
      "type": "build_failed",
      "message": "Build command failed",
      "details": "npm run build exited with code 1"
    }
  ]
}
```

## Framework-Specific Implementations

Each framework handler implements the `FrameworkHandler` interface and is responsible for:

1. **Configuration Generation**: Creating appropriate wrangler.jsonc settings for the framework
2. **Script Updates**: Modifying package.json scripts for build and deployment
3. **Validation**: Ensuring the generated configuration is valid
4. **Build Testing**: Running the build process to verify the migration works

### Handler Interface

```typescript
interface FrameworkHandler {
  async migrate(projectPath: string): Promise<MigrationResult>
}

interface MigrationResult {
  success: boolean
  changes: {
    files_created: Array<{ path: string; summary: string }>
    files_modified: Array<{ path: string; summary: string }>
    dependencies_updated: string[]
  }
  warnings: Warning[]
  validation: ValidationResult
}
```

**Note**: Implementation should use Zod v4 schemas for runtime validation of these interfaces.

### Example Implementation

```typescript
class AstroSSGHandler implements FrameworkHandler {
  async migrate(projectPath: string): Promise<MigrationResult> {
    // 1. Generate wrangler.jsonc with pages_build_output_dir
    // 2. Add postbuild script for wrangler pages functions build
    // 3. Validate configuration against JSON schema
    // 4. Run build validation and capture results

    return {
      success: true,
      changes: {
        files_created: [
          {
            path: 'wrangler.jsonc',
            summary: 'Generated Astro SSG configuration with pages_build_output_dir set to "dist"',
          },
        ],
        files_modified: [
          {
            path: 'package.json',
            summary: 'Added postbuild script: "wrangler pages functions build"',
          },
        ],
        dependencies_updated: ['wrangler@4.x.x'],
      },
      warnings: [],
      validation: { config_valid: true, build_successful: true },
    }
  }
}
```

## Error Handling

### Framework Conflicts

When multiple frameworks are detected:

1. List all detected frameworks
2. Exit with code 2
3. Provide clear guidance for using `--force`

### Configuration Conflicts

When existing wrangler configs are found:

1. Backup existing config (rename with .backup extension)
2. Generate new configuration
3. Log the backup location

### Build Failures

When build validation fails:

1. Capture full build output
2. Include in output summary
3. Continue with other validation steps
4. Use exit code 4 (non-fatal)

## Testing Strategy

### Unit Tests

- Framework detection logic
- Configuration generation
- Output formatting
- Validation functions

### Integration Tests

- End-to-end migration scenarios
- Build validation testing
- Error handling scenarios

### Test Projects

Create minimal test projects for each framework:

- `test/fixtures/astro-ssg/`
- `test/fixtures/astro-ssr/`
- `test/fixtures/remix/`
- `test/fixtures/svelte/`

## Future Considerations

### Extensibility

- Plugin system for additional frameworks
- Custom configuration templates
- External validation rules

### Performance

- Parallel validation steps
- Caching of framework detection
- Incremental migration updates

### Observability

- Detailed logging with log levels
- Migration analytics
- Performance metrics
