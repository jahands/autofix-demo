#!/usr/bin/env node

import 'zx/globals'

import { program } from '@commander-js/extra-typings'
import { catchProcessError } from '@jahands/cli-tools/proc'

import { version } from '../../package.json'

program
	.name('autofix-cli')
	.description('A CLI for autofixing issues, such as Cloudflare Workers compatibility issues')
	.version(version)

	.action(async () => {
		console.log('Hello, world!')
	})

	.parseAsync()
	.catch(catchProcessError())
