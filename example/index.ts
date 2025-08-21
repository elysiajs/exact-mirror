import { t } from 'elysia'
import createMirror, { createMirrorCode } from '../src/index'

import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Recursive((This) =>
	t.Object({
		type: t.String(),
		data: t.Union([t.Nullable(This), t.Array(This)])
	})
)

const value = {
	type: 'yea',
	data: {
		type: 'ok',
		data: [
			{
				type: 'cool',
				data: null
			}
		]
	}
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler,
	sanitize: (a) => a
})

// console.log(mirror.toString())

// console.dir(mirror(value), {
// 	depth: null
// })
