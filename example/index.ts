import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Union([
	t.Undefined(),
	t.Object({
		name: t.String(),
		job: t.String(),
		trait: t.Optional(t.String())
	})
])

const value = undefined satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
