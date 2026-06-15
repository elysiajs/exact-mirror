import { bench, run, barplot, summary, compact } from 'mitata'

import { Type as t } from 'typebox'
import { Value } from 'typebox/value'
import { Compile } from 'typebox/compile'

import { createMirror } from '../src'

// string -> number codec, the common coercion shape: number OR numeric string
const StringToNumber = t
	.Codec(t.String())
	.Decode((v: string) => +v)
	.Encode((v: number) => '' + v)

const Numeric = t.Union([t.Number(), StringToNumber])

const model = t.Object({
	id: Numeric,
	count: Numeric,
	nested: t.Object({ score: Numeric }),
	ids: t.Array(Numeric)
})

const value = {
	id: '1',
	count: '2',
	nested: { score: '3' },
	ids: ['4', '5', '6']
}

const decode = createMirror(model, { decode: true, Compile })

if (process.env.DEBUG) console.log(decode.toString())

// sanity: exact-mirror decode must agree with TypeBox Value.Decode
if (
	JSON.stringify(decode(structuredClone(value))) !==
	JSON.stringify(Value.Decode(model, structuredClone(value)))
) {
	console.log('mirror :', decode(structuredClone(value)))
	console.log('typebox:', Value.Decode(model, structuredClone(value)))
	throw new Error('Invalid result')
}

const compiled = Compile(model)

compact(() => {
	barplot(() => {
		summary(() => {
			bench('TypeBox Value.Decode', () => Value.Decode(model, value))

			bench('TypeBox Compile.Decode', () => compiled.Decode(value))

			bench('Exact Mirror decode', () => decode(value))
		})
	})
})

run()
