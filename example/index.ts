import { t } from 'elysia'
import { createMirror } from '../src/index'

const shape = t.Array(
	t.Object({
		name: t.String(),
		optional1: t.Optional(t.String()),
		optional2: t.Optional(t.String())
	})
)

const value = [
	{
		name: 'salt',
		optional1: 'ok',
		// @ts-expect-error
		additional: 'b'
	},
	{
		name: 'chiffon'
	}
] satisfies typeof shape.static

const mirror = createMirror(shape)

console.dir(mirror(value), {
	depth: null
})
// console.log(stringify.toString())
