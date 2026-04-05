import { bench, run, barplot, summary, compact } from 'mitata'

import { createMirror } from '../src'

import { Value } from 'typebox/value'
import { Compile } from 'typebox/compile'
import type { Static, TSchema } from 'typebox/type'

export const benchmark = <T extends TSchema>(
	model: T,
	value: Static<T>,
	options?: Parameters<typeof createMirror>[1]
) => {
	const mirror = createMirror(model, {
		Compile
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
					return mirror(value)
				})

				const comp = Compile(model)

				bench('TypeBox Compile.Clean', () => {
					return comp.Clean(value)
				})
			})
		})
	})

	run()
}
