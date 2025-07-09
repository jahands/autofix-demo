#!/usr/bin/env node

import 'zx/globals'

import { program } from '@commander-js/extra-typings'
import { catchProcessError } from '@jahands/cli-tools/proc'
import { createPagesToWorkersCommand } from '../commands/pages-to-workers.cmd.js'

import { version } from '../../package.json'

program
	.name('autofix-cli')
	.description('A CLI for autofixing issues, such as Cloudflare Workers compatibility issues')
	.version(version)

// Add subcommands
program.addCommand(createPagesToWorkersCommand())

// If no command is provided, show help
program.action(() => {
	program.help()
})

program
	.parseAsync()
	.catch(catchProcessError())
