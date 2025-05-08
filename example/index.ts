import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	foo: t.Optional(
		t.Nullable(
			t.Object({
				a: t.Number({
					error: 'Must be a number'
				})
			})
		)
	)
})

const value = {
	foo: 123
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
