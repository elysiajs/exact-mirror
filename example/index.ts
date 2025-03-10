import { t } from 'elysia'
import { createMirror } from '../src/index'
import { TypeCompiler } from '@sinclair/typebox/compiler'

const v = t.Module({
	a: t.Object({
		name: t.String(),
		job: t.Optional(t.Ref('job')),
		trait: t.Optional(t.String())
	}),
	job: t.String()
})

const shape = v.Import('a')

const value = {
	name: 'Jane Doe',
	job: 'Software Engineer',
	trait: 'Friendly'
} satisfies typeof shape.static

const mirror = createMirror(shape, {
	TypeCompiler
})

console.log(mirror(value))
