import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object(
	{
		keys: t.Array(t.Object({ a: t.Number() }))
	},
	{
		additionalProperties: true
	}
)

const value = {
	keys: [
		{
			a: 1,
			// @ts-expect-error
			b: 2
		}
	],
	extra: true
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
