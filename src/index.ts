import { TypeCompiler, type TypeCheck } from '@sinclair/typebox/compiler'
import type { TAnySchema, TModule, TRecord } from '@sinclair/typebox'
import { deepMatch } from 'bun'

const Kind = Symbol.for('TypeBox.Kind')
const Hint = Symbol.for('TypeBox.Hint')

const isSpecialProperty = (name: string) =>
	/(\ |-|\t|\n)/.test(name) || !isNaN(+name[0])

const joinProperty = (v1: string, v2: string | number, isOptional = false) => {
	if (typeof v2 === 'number') return `${v1}[${v2}]`

	if (isSpecialProperty(v2)) return `${v1}${isOptional ? '?.' : ''}["${v2}"]`

	return `${v1}${isOptional ? '?' : ''}.${v2}`
}

const encodeProperty = (v: string) => (isSpecialProperty(v) ? `"${v}"` : v)

const sanitize = (key: string, sanitize = 0, schema: TAnySchema) => {
	if (schema.type !== 'string' || schema.const || schema.trusted) return key

	let hof = ''
	for (let i = sanitize - 1; i >= 0; i--) hof += `d.h${i}(`
	return hof + key + ')'.repeat(sanitize)
}

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

type MaybeArray<T> = T | T[]

export interface Instruction {
	optionals: string[]
	optionalsInArray: string[][]
	parentIsOptional: boolean
	array: number
	unions: TypeCheck<any>[][]
	unionKeys: Record<string, 1>
	sanitize: MaybeArray<(v: string) => string> | undefined
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
	modules?: TModule<any, any>
	definitions: Record<string, TAnySchema>
	recursion: number
	/**
	 * @default 8
	 */
	recursionLimit: number
	/**
	 * If incorrect type is passed to Union value, should it be removed?
	 *
	 * If you check a value later, it's recommended to set this to `false`
	 * otherwise, set this to true
	 *
	 * @default false
	 */
	removeUnknownUnionType: boolean
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

	let v =
		`(()=>{` +
		`const ar${i}s=Object.keys(${property}),` +
		`ar${i}v={};` +
		`for(let i=0;i<ar${i}s.length;i++){` +
		`const ar${i}p=${property}[ar${i}s[i]];` +
		`ar${i}v[ar${i}s[i]]=${mirror(child, `ar${i}p`, instruction)}`

	const optionals = instruction.optionalsInArray[i + 1]
	if (optionals)
		for (let oi = 0; oi < optionals.length; oi++) {
			const target = `ar${i}v[ar${i}s[i]].${optionals[oi]}`

			v += `;if(${target}===undefined)delete ${target}`
		}

	v += `}` + `return ar${i}v` + `})()`

	return v
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

export function deepClone<T>(source: T, weak = new WeakMap<object, any>()): T {
	if (
		source === null ||
		typeof source !== 'object' ||
		typeof source === 'function'
	)
		return source

	// Circular‑reference guard
	if (weak.has(source as object)) return weak.get(source as object)

	if (Array.isArray(source)) {
		const copy: any[] = new Array(source.length)
		weak.set(source, copy)

		for (let i = 0; i < source.length; i++)
			copy[i] = deepClone(source[i], weak)

		return copy as any
	}

	if (typeof source === 'object') {
		const keys = Object.keys(source).concat(
			Object.getOwnPropertySymbols(source) as any[]
		)

		const cloned: Partial<T> = {}

		for (const key of keys)
			cloned[key as keyof T] = deepClone((source as any)[key], weak)

		return cloned as T
	}

	return source
}

const handleUnion = (
	schemas: TAnySchema[],
	property: string,
	instruction: Instruction
) => {
	// TODO: optimize null
	// if (schemas.length === 2 && schemas.find((x) => x.type === 'null')) {
	// 	const schema = schemas.find((x) => x.type !== 'null')

	// 	if (schema) return mirror(schema, property, instruction)
	// }

	if (instruction.TypeCompiler === undefined) {
		if (!instruction.typeCompilerWanred) {
			console.warn(
				new Error(
					"[exact-mirror] TypeBox's TypeCompiler is required to use Union"
				)
			)
			instruction.typeCompilerWanred = true
		}

		return property
	}

	instruction.unionKeys[property] = 1

	const ui = instruction.unions.length
	const typeChecks = (instruction.unions[ui] = <TypeCheck<any>[]>[])

	let v = `(()=>{\n`

	const unwrapRef = (type: TAnySchema) => {
		if (!(Kind in type) || !type.$ref) return type

		if (type[Kind] === 'This') {
			return deepClone(instruction.definitions[type.$ref])
		} else if (type[Kind] === 'Ref') {
			if (!instruction.modules)
				console.warn(
					new Error(
						'[exact-mirror] modules is required when using nested cyclic reference'
					)
				)
			else
				return instruction.modules.Import(
					type.$ref
				) as any as TAnySchema
		}

		return type
	}

	for (let i = 0; i < schemas.length; i++) {
		let type = unwrapRef(schemas[i])

		if (Array.isArray(type.anyOf))
			for (let i = 0; i < type.anyOf.length; i++)
				type.anyOf[i] = unwrapRef(type.anyOf[i])
		else if (type.items) {
			if (Array.isArray(type.items))
				for (let i = 0; i < type.items.length; i++)
					type.items[i] = unwrapRef(type.items[i])
			else type.items = unwrapRef(type.items)
		}

		typeChecks.push(TypeCompiler.Compile(type))
		v += `if(d.unions[${ui}][${i}].Check(${property})){return ${mirror(
			type,
			property,
			{
				...instruction,
				recursion: instruction.recursion + 1,
				parentIsOptional: true
			}
		)}}\n`
	}

	// unknown type, return as-is (this is a default intended behavior)
	// because it's expected that exact-mirror input should always be a correct value
	// returning an incorrect value then later checked is expected
	v +=
		`return ${instruction.removeUnknownUnionType ? 'undefined' : property}` +
		`})()`

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
		Kind in schema &&
		schema[Kind] === 'Import' &&
		schema.$ref in schema.$defs
	)
		return mirror(schema.$defs[schema.$ref], property, {
			...instruction,
			definitions: Object.assign(instruction.definitions, schema.$defs)
		})

	if (
		isRoot &&
		schema.type !== 'object' &&
		schema.type !== 'array' &&
		!schema.anyOf
	)
		return `return ${sanitize('v', instruction.sanitize?.length, schema)}`

	if (instruction.recursion >= instruction.recursionLimit) return property

	let v = ''

	if (schema.$id && Hint in schema)
		instruction.definitions[schema.$id] = schema

	switch (schema.type) {
		case 'object':
			if (schema[Kind as any] === 'Record') {
				v = handleRecord(schema as TRecord, property, instruction)

				break
			}

			schema = mergeObjectIntersection(schema)

			v += '{'

			if (schema.additionalProperties) v += `...${property},`

			const keys = Object.keys(schema.properties)
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]

				let isOptional =
					// all fields are optional
					!schema.required ||
					// field is explicitly required
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

				if (i !== 0) v += ','

				v += `${encodeProperty(key)}:${isOptional ? `${name}===undefined?undefined:` : ''}${mirror(
					child,
					name,
					{
						...instruction,
						recursion: instruction.recursion + 1,
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
				if (Array.isArray(schema.items)) {
					v = handleTuple(schema.items, property, instruction)
					break
				} else if (isRoot) return 'return v'
				else if (
					Kind in schema.items &&
					schema.items.$ref &&
					(schema.items[Kind] === 'Ref' ||
						schema.items[Kind] === 'This')
				)
					v = mirror(
						deepClone(instruction.definitions[schema.items.$ref]),
						property,
						{
							...instruction,
							parentIsOptional: true,
							recursion: instruction.recursion + 1
						}
					)
				else {
					v = property
					break
				}
			}

			const i = instruction.array
			instruction.array++

			let reference = property

			if (isRoot) v = `const ar${i}v=new Array(${property}.length);`
			else {
				reference = `ar${i}s`
				v =
					`((${reference})=>{` +
					`const ar${i}v=new Array(${reference}.length);`
			}

			v +=
				`for(let i=0;i<${reference}.length;i++){` +
				`const ar${i}p=${reference}[i];` +
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

			if (!isRoot) v += `return ar${i}v})(${property})`

			break

		default:
			if (schema.$ref && schema.$ref in instruction.definitions)
				return mirror(
					instruction.definitions[schema.$ref],
					property,
					instruction
				)

			if (Array.isArray(schema.anyOf)) {
				v = handleUnion(schema.anyOf, property, instruction)

				break
			}

			v = sanitize(property, instruction.sanitize?.length, schema)

			break
	}

	if (!isRoot) return v

	if (schema.type === 'array') {
		// actually Tuple
		v = `${v}const x=ar0v;`
	} else {
		v = `const x=${v}\n`
	}

	for (let i = 0; i < instruction.optionals.length; i++) {
		const key = instruction.optionals[i]
		const prop = key.slice(1)

		v += `if(${key}===undefined`

		if (instruction.unionKeys[key]) v += `||x${prop}===undefined`

		// 63 is '?'
		const shouldQuestion =
			prop.charCodeAt(0) !== 63 && schema.type !== 'array'
		v += `)delete x${shouldQuestion ? '?' : ''}${prop}\n`
	}

	return `${v}return x`
}

export const createMirror = <T extends TAnySchema>(
	schema: T,
	{
		TypeCompiler,
		modules,
		definitions,
		sanitize,
		recursionLimit = 8,
		removeUnknownUnionType = false
	}: Partial<
		Pick<
			Instruction,
			| 'TypeCompiler'
			| 'definitions'
			| 'sanitize'
			| 'modules'
			| 'recursionLimit'
			| 'removeUnknownUnionType'
		>
	> = {}
): ((v: T['static']) => T['static']) => {
	const unions = <Instruction['unions']>[]

	if (typeof sanitize === 'function') sanitize = [sanitize]

	const f = mirror(schema, 'v', {
		optionals: [],
		optionalsInArray: [],
		array: 0,
		parentIsOptional: false,
		unions,
		unionKeys: {},
		TypeCompiler,
		modules,
		// @ts-ignore private property
		definitions: definitions ?? modules?.$defs ?? {},
		sanitize,
		recursion: 0,
		recursionLimit,
		removeUnknownUnionType
	})

	if (!unions.length && !sanitize?.length) return Function('v', f) as any

	let hof: Record<string, Function> | undefined
	if (sanitize?.length) {
		hof = {}
		for (let i = 0; i < sanitize.length; i++) hof[`h${i}`] = sanitize[i]
	}

	return Function(
		'd',
		`return function mirror(v){${f}}`
	)({
		unions,
		...hof
	}) as any
}

export default createMirror
