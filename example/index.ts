import { t } from 'elysia'
import createMirror from '../src/index'

import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Union([
	t.Object({
		status: t.Literal('a'),
		a: t.Object({ b: t.Integer() })
	}),
	t.Object({ status: t.Literal('healthy') })
])

const value = {
	status: 'healthy'
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

// console.log(mirror.toString())

console.dir(mirror(value), {
	depth: null
})
