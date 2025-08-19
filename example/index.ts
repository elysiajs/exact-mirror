import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	'is-admin': t.Union([
		t.Boolean(),
		t.String({
			format: 'boolean'
		})
	])
})

const value = {
	'is-admin': true
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.dir(mirror(value), {
	depth: null
})
