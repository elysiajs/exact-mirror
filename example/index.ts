import { t } from 'elysia'
import { createMirror } from '../src/index'

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

const value = {
	type: 'email',
	name: '&',
	details: {
		from: 'c',
		subject: 'c'
	}
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	sanitize: [
		(v) => {
			if (v === '&') return 'no'

			return v
		}
	]
	// TypeCompiler
})

console.log(mirror(value))
