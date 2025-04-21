import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	type: t.Literal('email'),
	name: t.String(),
	details: t.Object(
		{
			from: t.String({
				default: 'mydefault',
				maxLength: 512
			}),
			subject: t.String({
				maxLength: 512
			})
		},
		{ default: {} }
	)
})

// console.log(t.Optional(t.String()))

const value = {} satisfies typeof shape.static

const mirror = createMirror(shape, {
	// TypeCompiler
})

console.log(mirror(value))
