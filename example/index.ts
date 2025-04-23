import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const shape = t.Object({
	hello: t.String(),
	detail: t.Union([
		t.Object({
			world: t.String()
		}),
		t.Object({
			world2: t.String()
		})
	])
})

const value = {
	hello: 'Hello',
	detail: { world: 'World' }
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	sanitize: [
		(v) => {
			if (v === '&') return 'no'

			return v
		}
	],
	TypeCompiler
})

console.log(mirror(value))
