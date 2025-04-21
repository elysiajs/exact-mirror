import { bench, run, barplot, summary, compact } from 'mitata'

import { createMirror } from '../src'

import { Value } from '@sinclair/typebox/value'
import { TypeCompiler } from '@sinclair/typebox/compiler'

import type { TAnySchema } from '@sinclair/typebox'

export const benchmark = <T extends TAnySchema>(
	model: T,
	value: T['static'],
	options?: Parameters<typeof createMirror>[1]
) => {
	const mirror = createMirror(model, {
		TypeCompiler
	})

	if (process.env.DEBUG) {
		console.log(mirror.toString())
	}

	if (
		JSON.stringify(mirror(value)) !==
		JSON.stringify(Value.Clean(model, value))
	) {
		console.log(mirror(value))
		console.log('---')
		console.log(mirror.toString())
		throw new Error('Invalid result')
	}

	compact(() => {
		barplot(() => {
			summary(() => {
				bench('TypeBox Value.Clean', () => {
					return Value.Clean(model, value)
				})

				bench('Exact Mirror', () => {
					try {
						return mirror(value)
					} catch {}
				})

				// const validator = TypeCompiler.Compile(model)

				// bench('Mirror w/ validation', () => {
				// 	return validator.Check(mirror(value))
				// })
			})
		})
	})

	run()
}
