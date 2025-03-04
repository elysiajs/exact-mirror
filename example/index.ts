import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	a: t.Union([
		t.Object({ a: t.String() }),
		t.Object(
			{ b: t.String() },
			{
				additionalProperties: true
			}
		),
		t.String()
	])
})

const value = {
	a: {
		a: 'b',
		c: 'a'
	}
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	// TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
