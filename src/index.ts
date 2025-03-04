import type { TAnySchema } from '@sinclair/typebox'

const Kind = Symbol.for('TypeBox.Kind')
const OptionalKind = Symbol.for('TypeBox.Optional')

const isSpecialProperty = (name: string) => /(\ |-|\t|\n)/.test(name)

const joinProperty = (v1: string, v2: string) => {
	if (isSpecialProperty(v2)) return `${v1}["${v2}"]`

	return `${v1}.${v2}`
}

const encodeProperty = (v: string) => (isSpecialProperty(v) ? `"${v}"` : v)

export const mergeObjectIntersection = (schema: TAnySchema): TAnySchema => {
	if (
		!schema.allOf ||
		(Kind in schema &&
			(schema[Kind] !== 'Intersect' || schema.type !== 'object'))
	)
		return schema

	const { allOf, ...newSchema } = schema
	newSchema.properties = {}

	if (Kind in newSchema) newSchema[Kind as any] = 'Object'

	for (const type of allOf) {
		if (type.type !== 'object') continue

		const { properties, required, type: _, [Kind]: __, ...rest } = type

		if (required)
			newSchema.required = newSchema.required
				? newSchema.required.concat(required)
				: required

		Object.assign(newSchema, rest)

		for (const property in type.properties)
			newSchema.properties[property] = mergeObjectIntersection(
				type.properties[property]
			)
	}

	return newSchema
}

interface Instruction {
	optionals: string[]
	optionalsInArray: string[][]
	array: number
}

const mirror = (
	schema: TAnySchema,
	property: string,
	instruction: Instruction
): string => {
	if (!schema) return ''

	const isRoot = property === 'v'

	if (isRoot && schema.type !== 'object' && schema.type !== 'array')
		return `return v`

	let v = ''

	switch (schema.type) {
		case 'object':
			schema = mergeObjectIntersection(schema)

			v += '{'

			if (schema.additionalProperties) v += `...${property}`

			const keys = Object.keys(schema.properties)
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]
				const name = joinProperty(property, key)

				if (!schema.required.includes(key)) {
					const index = instruction.array

					if (property.startsWith('ar')) {
						const array = instruction.optionalsInArray
						if (array[index]) array[index].push(name.slice(5))
						else array[index] = [name.slice(5)]
					} else {
						instruction.optionals.push(name)
					}
				}

				const child = schema.properties[key]

				if (schema.additionalProperties && child.type !== 'object')
					continue

				if (i !== 0) v += ','

				v += `${encodeProperty(key)}:${mirror(child, name, instruction)}`
			}

			v += '}'

			break

		case 'array':
			const i = instruction.array
			instruction.array++

			if (
				schema.items.type !== 'object' &&
				schema.items.type !== 'array'
			) {
				v = property

				break
			}

			if (!isRoot) v = `(()=>{`

			v +=
				`const ar${i}s=${property},` +
				`ar${i}v=new Array(${property}.length);` +
				`for(let i=0;i<ar${i}s.length;i++){` +
				`const ar${i}p=ar${i}s[i];` +
				`ar${i}v[i]=${mirror(schema.items, `ar${i}p`, instruction)};`

			const optionals = instruction.optionalsInArray[i + 1]
			if (optionals) {
				// optional index
				for (let oi = 0; oi < optionals.length; oi++) {
					const key = `ar${i}v[i].${optionals[oi]}`

					if (oi !== 0) v += ';'
					v += `if(${key}===undefined)delete ${key}`
				}
			}

			v += `}`

			if (!isRoot) v += `}return ar${i}v})()`

			break

		default:
			v = property
	}

	if (!isRoot) return v

	if (schema.type === 'array') return `${v}return ar0v`

	v = `const x=${v}\n`

	for (let i = 0; i < instruction.optionals.length; i++) {
		const key = instruction.optionals[i]

		v += `if(${key}===undefined)delete x${key.slice(1)}\n`
	}

	return `${v}return x`
}

export const createMirror = <T extends TAnySchema>(
	schema: T
): ((v: T['static']) => T['static']) => {
	const f = mirror(schema, 'v', {
		optionals: [],
		optionalsInArray: [],
		array: 0
	})

	return Function('v', f) as any
}

export default createMirror

// const shape = t.Object({
// 	a: t.Nullable(
// 		t.Object({
// 			a: t.String()
// 		})
// 	)
// })

// const shape = t.Object({
// 	a: t.String(),
// 	social: t.Optional(
// 		t.Object({
// 			facebook: t.Nullable(t.String()),
// 			twitter: t.Nullable(t.String()),
// 			youtube: t.Nullable(t.String())
// 		})
// 	)
// })

// const stringify = createaccelerate(shape)

// console.log(
// 	stringify({
// 		a: 'a',
// 		social: {
// 			a: 'a',
// 		}
// 	})
// )
