import { t } from 'elysia'
import createMirror from '../src/index'

import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	total: t
		.Transform(t.Number())
		.Decode((x) => x)
		.Encode((x) => x),
	user: t.Object({
		username: t.String()
	}),
})

const value = {
	total: 1,
	user: { username: 'Bob', secret: 'shhh' }
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler,
	sanitize: (a) => a
})

console.dir(mirror(value), {
	depth: null
})
