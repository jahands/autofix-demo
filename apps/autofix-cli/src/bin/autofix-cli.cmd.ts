#!/usr/bin/env node

import 'zx/globals'

import { program } from '@commander-js/extra-typings'
import { catchProcessError } from '@jahands/cli-tools/proc'

import { version } from '../../package.json'
import { pagesToWorkersCmd } from '../commands/pages-to-workers.cmd.js'

program
	.name('autofix-cli')
	.description('A CLI for autofixing issues, such as Cloudflare Workers compatibility issues')
	.version(version)

	.addCommand(pagesToWorkersCmd)

	.parseAsync()
	.catch(catchProcessError())
