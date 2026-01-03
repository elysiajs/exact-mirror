import { t } from 'elysia'
import createMirror from '../src/index'

import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	users: t.Array(
		t.Object({
			name: t.String(),
			avatar: t.Nullable(t.Object({ url: t.String() }))
		})
	),
	meta: t.Object({
		pagination: t.Array(t.Object({ page: t.Integer() }))
	})
})

const value = {
	users: [
		{
			name: 'a',
			avatar: { url: 'http://example.com/avatar.png' }
		},
		{
			name: 'b',
			avatar: null
		}
	],
	meta: {
		pagination: [
			{
				page: 1
			}
		]
	}
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

// console.log(mirror.toString())

console.dir(mirror(value), {
	depth: null
})
