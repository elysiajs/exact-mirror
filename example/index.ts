import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Module({
	a: t.Object({
		type: t.String(),
		data: t.Union([t.Nullable(t.Ref('a')), t.Array(t.Ref('a'))])
	})
})

const actual = shape.Import('a')

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
} satisfies typeof actual.static

const mirror = createMirror(actual, {
	TypeCompiler,
	modules: shape
})

console.dir(mirror(value), {
	depth: null
})
