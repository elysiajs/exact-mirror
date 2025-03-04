import { TypeCompiler, type TypeCheck } from '@sinclair/typebox/compiler'
import type { TAnySchema, TRecord } from '@sinclair/typebox'

const Kind = Symbol.for('TypeBox.Kind')

const isSpecialProperty = (name: string) => /(\ |-|\t|\n)/.test(name)

const joinProperty = (v1: string, v2: string | number, isOptional = false) => {
	if (typeof v2 === 'number') return `${v1}[${v2}]`

	if (isSpecialProperty(v2)) return `${v1}${isOptional ? '?.' : ''}["${v2}"]`

	return `${v1}${isOptional ? '?' : ''}.${v2}`
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
	parentIsOptional: boolean
	array: number
	unions: TypeCheck<any>[][]
	unionKeys: Record<string, 1>
	/**
	 * TypeCompiler is required when using Union
	 *
	 * Left as opt-in to reduce bundle size
	 * many end-user doesn't use Union
	 *
	 * @default undefined
	 */
	TypeCompiler?: typeof TypeCompiler
	typeCompilerWanred?: boolean
}

const handleRecord = (
	schema: TRecord,
	property: string,
	instruction: Instruction
) => {
	const child =
		schema.patternProperties['^(.*)$'] ??
		schema.patternProperties[Object.keys(schema.patternProperties)[0]]

	if (!child) return property

	const i = instruction.array
	instruction.array++

	return (
		`(()=>{` +
		`const ar${i}s=Object.keys(${property}),` +
		`ar${i}v={};` +
		`for(let i=0;i<ar${i}s.length;i++){` +
		`const ar${i}p=${property}[ar${i}s[i]];` +
		`ar${i}v[ar${i}s[i]]=${mirror(child, `ar${i}p`, instruction)}` +
		`}` +
		`return ar${i}v` +
		`})()`
	)
}

const handleTuple = (
	schema: TAnySchema[],
	property: string,
	instruction: Instruction
) => {
	const i = instruction.array
	instruction.array++

	const isRoot = property === 'v' && !instruction.unions.length

	let v = ''
	if (!isRoot) v = `(()=>{`

	v += `const ar${i}v=[`

	for (let i = 0; i < schema.length; i++) {
		if (i !== 0) v += ','

		v += mirror(
			schema[i],
			joinProperty(property, i, instruction.parentIsOptional),
			instruction
		)
	}

	v += `];`

	if (!isRoot) v += `return ar${i}v})()`

	return v
}

const handleUnion = (
	schemas: TAnySchema[],
	property: string,
	instruction: Instruction
) => {
	if (instruction.TypeCompiler === undefined) {
		if (!instruction.typeCompilerWanred) {
			console.warn(
				new Error("TypeBox's TypeCompiler is required to use Union")
			)
			instruction.typeCompilerWanred = true
		}

		return property
	}

	instruction.unionKeys[property] = 1

	const ui = instruction.unions.length
	const typeChecks = (instruction.unions[ui] = <TypeCheck<any>[]>[])

	let v = `(()=>{\n`

	for (let i = 0; i < schemas.length; i++) {
		typeChecks.push(TypeCompiler.Compile(schemas[i]))
		v += `if(d.unions[${ui}][${i}].Check(${property})){return ${mirror(
			schemas[i],
			property,
			{
				...instruction,
				parentIsOptional: true
			}
		)}}\n`
	}

	v += `return undefined` + `})()`

	return v
}

const mirror = (
	schema: TAnySchema,
	property: string,
	instruction: Instruction
): string => {
	if (!schema) return ''

	const isRoot = property === 'v' && !instruction.unions.length

	if (
		isRoot &&
		schema.type !== 'object' &&
		schema.type !== 'array' &&
		!schema.anyOf
	)
		return `return v`

	let v = ''

	switch (schema.type) {
		case 'object':
			if (schema[Kind as any] === 'Record') {
				v = handleRecord(schema as TRecord, property, instruction)

				break
			}

			schema = mergeObjectIntersection(schema)

			v += '{'

			if (schema.additionalProperties) v += `...${property}`

			const keys = Object.keys(schema.properties)
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]

				let isOptional =
					(schema.required && !schema.required.includes(key)) ||
					Array.isArray(schema.properties[key].anyOf)

				const name = joinProperty(
					property,
					key,
					instruction.parentIsOptional
				)

				if (isOptional) {
					const index = instruction.array

					if (property.startsWith('ar')) {
						const refName = name.slice(name.indexOf('.') + 1)
						const array = instruction.optionalsInArray

						if (array[index]) array[index].push(refName)
						else array[index] = [refName]
					} else {
						instruction.optionals.push(name)
					}
				}

				const child = schema.properties[key]

				if (schema.additionalProperties && child.type !== 'object')
					continue

				if (i !== 0) v += ','

				v += `${encodeProperty(key)}:${isOptional ? `${name}===undefined?undefined:` : ''}${mirror(
					child,
					name,
					{
						...instruction,
						parentIsOptional: isOptional
					}
				)}`
			}

			v += '}'

			break

		case 'array':
			if (
				schema.items.type !== 'object' &&
				schema.items.type !== 'array'
			) {
				if (Array.isArray(schema.items))
					v = handleTuple(schema.items, property, instruction)
				else if (isRoot) return 'return v'
				else v = property

				break
			}

			const i = instruction.array
			instruction.array++

			if (!isRoot) v = `(()=>{`

			v +=
				`const ar${i}s=${property},` +
				`ar${i}v=new Array(${property}.length);` +
				`for(let i=0;i<ar${i}s.length;i++){` +
				`const ar${i}p=ar${i}s[i];` +
				`ar${i}v[i]=${mirror(schema.items, `ar${i}p`, instruction)}`

			const optionals = instruction.optionalsInArray[i + 1]
			if (optionals) {
				// optional index
				for (let oi = 0; oi < optionals.length; oi++) {
					// since pointer is checked in object case with ternary as undefined, this is not need
					// const pointer = `ar${i}p.${optionals[oi]}`

					const target = `ar${i}v[i].${optionals[oi]}`

					// we can add semi-colon here because it delimit recursive mirror
					v += `;if(${target}===undefined)delete ${target}`
				}
			}

			v += `}`

			if (!isRoot) v += `return ar${i}v})()`

			break

		default:
			if (Array.isArray(schema.anyOf)) {
				v = handleUnion(schema.anyOf, property, instruction)

				break
			}

			v = property
			break
	}

	if (!isRoot) return v

	if (schema.type === 'array') return `${v}return ar0v`

	v = `const x=${v}\n`

	for (let i = 0; i < instruction.optionals.length; i++) {
		const key = instruction.optionals[i]
		const prop = key.slice(1)

		v += `if(${key}===undefined`

		if (instruction.unionKeys[key]) v += `||x${prop}===undefined`

		v += `)delete x${prop.charCodeAt(0) !== 63 ? '?' : ''}${prop}\n`
	}

	return `${v}return x`
}

export const createMirror = <T extends TAnySchema>(
	schema: T,
	{ TypeCompiler }: Pick<Instruction, 'TypeCompiler'> = {}
): ((v: T['static']) => T['static']) => {
	const unions = <Instruction['unions']>[]

	const f = mirror(schema, 'v', {
		optionals: [],
		optionalsInArray: [],
		array: 0,
		parentIsOptional: false,
		unions,
		unionKeys: {},
		TypeCompiler
	})

	if (!unions.length) return Function('v', f) as any

	const fn = `return function mirror(v){${f}}`

	return Function(
		'd',
		fn
	)({
		unions
	}) as any
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
