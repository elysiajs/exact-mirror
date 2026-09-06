import type { TSchema, TModule, TRecord, Static } from 'typebox'
import type { Compile, Validator } from 'typebox/compile'

const Kind = '~kind'
const Hint = '~hint'
const Codec = '~codec'

// shallow copy, preserve TypeBox metadata (`~codec`/`~kind`/`~refine`)
export const copySchema = <T>(node: T): T =>
	Object.create(
		Object.getPrototypeOf(node),
		Object.getOwnPropertyDescriptors(node)
	)

const copySchemaWith = <T>(node: T, overrides: Record<string, unknown>): T => {
	const descriptors = Object.getOwnPropertyDescriptors(node) as Record<
		string,
		PropertyDescriptor
	>

	for (const key in overrides)
		descriptors[key] = {
			value: overrides[key],
			writable: true,
			enumerable: descriptors[key]?.enumerable ?? true,
			configurable: true
		}

	return Object.create(Object.getPrototypeOf(node), descriptors)
}

interface BaseSchema {
	'~kind': string
	id?: string
	$id?: string
	type?: string
	$schema?: string
	const?: unknown[]
	// title?: string
	// description?: string
	// multipleOf?: number
	// maximum?: number
	// exclusiveMaximum?: boolean
	// minimum?: number
	// exclusiveMinimum?: boolean
	// maxLength?: number
	// minLength?: number
	pattern?: string
	additionalItems?: boolean | AnySchema
	items?: AnySchema | AnySchema[]
	// maxItems?: number
	// minItems?: number
	// uniqueItems?: boolean
	// maxProperties?: number
	// minProperties?: number
	required?: string[]
	additionalProperties?: boolean | AnySchema
	definitions?: {
		[name: string]: AnySchema
	}
	properties?: {
		[name: string]: AnySchema
	}
	patternProperties?: {
		[name: string]: AnySchema
	}
	dependencies?: {
		[name: string]: AnySchema | string[]
	}
	enum?: any[]
	allOf?: AnySchema[]
	anyOf?: AnySchema[]
	oneOf?: AnySchema[]
	not?: AnySchema
	$ref?: string
	$defs?: Record<string, AnySchema>
}

type AnySchema = TSchema & BaseSchema

const isSpecialProperty = (name: string) =>
	!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)

const joinProperty = (v1: string, v2: string | number, isOptional = false) => {
	if (typeof v2 === 'number') return `${v1}[${v2}]`

	if (isSpecialProperty(v2))
		return `${v1}${isOptional ? '?.' : ''}[${JSON.stringify(v2)}]`

	return `${v1}${isOptional ? '?' : ''}.${v2}`
}

const encodeProperty = (v: string) =>
	isSpecialProperty(v) ? JSON.stringify(v) : v

const sanitize = (key: string, sanitize = 0, schema: AnySchema) => {
	// @ts-expect-error
	if (schema.type !== 'string' || schema.const || schema.trusted) return key

	let hof = ''
	for (let i = sanitize - 1; i >= 0; i--) hof += `d.h${i}(`
	return hof + key + ')'.repeat(sanitize)
}

export const mergeObjectIntersection = (schema: AnySchema): AnySchema => {
	if (!schema.allOf || (Kind in schema && schema[Kind] !== 'Intersect'))
		return schema

	const { allOf, ...newSchema } = schema
	newSchema.properties = {}
	newSchema.type = 'object'

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

export interface Instruction<Emit extends boolean = false> {
	optionals: string[]
	optionalsInArray: string[][]
	parentIsOptional: boolean
	array: number
	unions: Validator<any>[][]
	unionKeys: Record<string, 1>
	sanitize: MaybeArray<(v: string) => string> | undefined
	fromUnion?: boolean
	emit?: Emit
	/**
	 * Apply a TypeBox codec's `~codec` transform at codec leaves during the
	 * mirror walk, instead of only cleaning the value.
	 *
	 * @default undefined — pure clean, no transform
	 */
	transform?: 'decode' | 'encode'
	/**
	 * Codec transform functions collected during codegen, referenced from the
	 * generated source by index as `d.codecs[i]`
	 */
	codecs: Function[]
	/**
	 * TypeCompiler is required when using Union
	 *
	 * Left as opt-in to reduce bundle size
	 * many end-user doesn't use Union
	 *
	 * @default undefined
	 */
	Compile?: typeof Compile
	typeCompilerWanred?: boolean
	modules?: TModule<{}>
	definitions: Record<string, AnySchema>
	/**
	 * Shared cyclic codegen state: generated per-definition mirror
	 * functions, grouped by `$defs` object identity
	 */
	cyclic: CyclicContext
	/**
	 * `$defs` group the current cyclic definition body is generated
	 * against, used to resolve `Ref` nodes to function calls
	 */
	cyclicDefs?: CyclicGroup
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
		`ar${i}v=Object.create(null);` +
		`for(let i=0;i<ar${i}s.length;i++){` +
		`const ar${i}p=${property}[ar${i}s[i]];` +
		`ar${i}v[ar${i}s[i]]=${mirror(child as AnySchema, `ar${i}p`, instruction)}`

	const optionals = instruction.optionalsInArray[i + 1]
	if (optionals) {
		for (let oi = 0; oi < optionals.length; oi++) {
			const target = `ar${i}v[ar${i}s[i]]${optionals[oi]}`

			v += `;if(${target}===undefined)delete ${target}`
		}
		// Clear the optionals array after use to prevent pollution across sibling arrays
		instruction.optionalsInArray[i + 1] = []
	}

	v += `}` + `return Object.setPrototypeOf(ar${i}v,Object.prototype)` + `})()`

	return v
}

const handleTuple = (
	schema: AnySchema[],
	property: string,
	instruction: Instruction
) => {
	const i = instruction.array
	instruction.array++

	const isRoot = property === 'v' && !instruction.fromUnion

	let v = ''
	if (!isRoot) v = `(()=>{`

	v += `const ar${i}v=[`

	for (let i = 0; i < schema.length; i++) {
		if (i !== 0) v += ','

		v += mirror(
			schema[i],
			joinProperty(
				property,
				i,
				instruction.parentIsOptional || instruction.fromUnion
			),
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

	const cloned: any = Object.create(Object.getPrototypeOf(source))
	weak.set(source, cloned)

	const descriptors = Object.getOwnPropertyDescriptors(source)
	for (const key of Reflect.ownKeys(descriptors)) {
		const descriptor = (descriptors as any)[key]
		if ('value' in descriptor)
			descriptor.value = deepClone(descriptor.value, weak)

		Object.defineProperty(cloned, key, descriptor)
	}

	return cloned as T
}

interface CyclicGroup {
	defs: Record<string, AnySchema>
	names: Record<string, string>
}

interface CyclicContext {
	groups: Map<object, CyclicGroup>
	fns: string[]
	count: number
}

const handleCyclic = (
	schema: AnySchema,
	property: string,
	instruction: Instruction
) => {
	const defs = schema.$defs!
	let group = instruction.cyclic.groups.get(defs)

	if (!group) {
		group = { defs, names: {} }
		instruction.cyclic.groups.set(defs, group)

		for (const name in defs)
			group.names[name] = `cy${instruction.cyclic.count++}`

		for (const name in defs)
			instruction.cyclic.fns.push(
				`function ${group.names[name]}(v){${mirror(defs[name], 'v', {
					...instruction,
					cyclicDefs: group,
					fromUnion: false,
					parentIsOptional: false,
					optionals: [],
					optionalsInArray: [],
					unionKeys: {},
					array: 0,
					recursion: 0
				})}}`
			)
	}

	const fn = group.names[schema.$ref!]

	if (!fn)
		throw new Error(
			`[exact-mirror] cyclic reference "${schema.$ref}" is not found in $defs`
		)

	// incorrect (nullish) value is passed as-is, like union's default behavior
	return `(${property}==null?${property}:${fn}(${property}))`
}

// a type referencing cyclic definitions can only be checked with its
// `$defs` context, rewrap it as a cyclic schema before compilation
function withDefs(type: AnySchema, group: CyclicGroup) {
	if (Kind in type) {
		// a cyclic schema carries its own $defs
		if (type[Kind] === 'Cyclic') return type

		if (type[Kind] === 'Ref' && type.$ref! in group.defs)
			return Object.defineProperty(
				{ $defs: group.defs, $ref: type.$ref },
				Kind,
				{ value: 'Cyclic' }
			) as AnySchema
	}

	let entry = '~check'
	while (entry in group.defs) entry += '~'

	// TypeBox use non-enumerable properties; force `$id` writable in case
	// `type` is a frozen schema that already carries a non-writable `$id`
	const def = copySchemaWith(type, { $id: entry })

	return Object.defineProperty(
		{ $defs: { ...group.defs, [entry]: def }, $ref: entry },
		Kind,
		{ value: 'Cyclic' }
	) as AnySchema
}

const handleUnion = (
	schemas: AnySchema[],
	property: string,
	instruction: Instruction
) => {
	// TODO: optimize null
	// if (schemas.length === 2 && schemas.find((x) => x.type === 'null')) {
	// 	const schema = schemas.find((x) => x.type !== 'null')

	// 	if (schema) return mirror(schema, property, instruction)
	// }

	if (instruction.Compile === undefined) {
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
	const typeChecks = (instruction.unions[ui] = <Validator<any>[]>[])

	const unwrapRef = (type: AnySchema): AnySchema => {
		if (!(Kind in type) || !type.$ref) return type

		if (type[Kind] === 'This')
			return deepClone(instruction.definitions[type.$ref])

		if (
			type[Kind] === 'Ref' &&
			!instruction.cyclicDefs &&
			type.$ref in instruction.definitions
		)
			return instruction.definitions[type.$ref]

		return type
	}

	const types: AnySchema[] = []
	for (let i = 0; i < schemas.length; i++) {
		let type = unwrapRef(schemas[i])

		if (Array.isArray(type.anyOf))
			type = copySchemaWith(type, { anyOf: type.anyOf.map(unwrapRef) })
		else if (type.items) {
			const items = Array.isArray(type.items)
				? type.items.map((item) => unwrapRef(item))
				: unwrapRef(type.items)

			type = copySchemaWith(type, { items })
		}

		typeChecks.push(
			instruction.Compile(
				instruction.cyclicDefs
					? (withDefs(type, instruction.cyclicDefs) as any)
					: type
			)
		)
		types.push(type)
	}

	const a = instruction.array
	instruction.array++
	const p = `ar${a}p`

	const member = (type: AnySchema) =>
		mirror(type, p, {
			...instruction,
			recursion: instruction.recursion + 1,
			parentIsOptional: true,
			fromUnion: true
		})

	const deletes = (target: string) => {
		const optionals = instruction.optionalsInArray[a + 1]
		if (!optionals) return ''

		let v = ''
		for (let oi = 0; oi < optionals.length; oi++)
			v += `if(${target}${optionals[oi]}===undefined)delete ${target}${optionals[oi]}\n`

		instruction.optionalsInArray[a + 1] = []

		return v
	}

	let v = `(function u${ui}(${p},r){\n`

	// some type require cleaning before checking
	// e.g. object with `additionalProperties: false`
	let cleanThenCheck = ''

	for (let i = 0; i < types.length; i++) {
		const check = `d.unions[${ui}][${i}].Check`

		if (instruction.transform && Codec in types[i]) {
			v += `if(!r&&${check}(${p}))return u${ui}(${member(types[i])},1)\n`
			cleanThenCheck += `if(!r){tmp=${member(types[i])}\nif(${check}(tmp))return tmp}\n`

			continue
		}

		v +=
			`if(${check}(${p})){const ar${a}v=${member(types[i])}\n` +
			deletes(`ar${a}v`) +
			`return ar${a}v}\n`

		cleanThenCheck +=
			`tmp=${member(types[i])}\n` +
			deletes('tmp') +
			`if(${check}(tmp))return tmp\n`
	}

	if (cleanThenCheck) v += `let tmp\n` + cleanThenCheck

	v += `return ${instruction.removeUnknownUnionType ? `r?${p}:undefined` : p}`

	return v + `})(${property})`
}

const mirror = (
	schema: AnySchema,
	property: string,
	instruction: Instruction
): string => {
	if (!schema) return ''

	const isRoot = property === 'v' && !instruction.fromUnion
	const optionalsLength = instruction.optionals.length

	try {
		if (instruction.transform && Codec in schema) {
			const codec = (schema as any)[Codec][instruction.transform]

			let ci = instruction.codecs.indexOf(codec)
			if (ci === -1) ci = instruction.codecs.push(codec) - 1

			const transformed = `d.codecs[${ci}](${property})`
			// the decoded value is no longer the encoded (string) type
			const body = mirrorNode(schema, transformed, {
				...instruction,
				sanitize: undefined
			})

			return isRoot ? `return ${body}` : body
		}

		if (Kind in schema && schema[Kind] === 'Cyclic') {
			const call = handleCyclic(schema, property, instruction)

			return isRoot ? `return ${call}` : call
		}

		return mirrorNode(schema, property, instruction)
	} catch (error) {
		// degrade only this subtree to identity instead of failing the whole mirror
		instruction.optionals.length = optionalsLength

		console.warn(
			new Error(
				'[exact-mirror] failed to generate mirror for a schema node, ' +
					'the node is passed through as-is. ' +
					'Please report this issue to https://github.com/elysiajs/exact-mirror/issues'
			),
			error
		)

		return isRoot ? 'return v' : property
	}
}

const mirrorNode = (
	schema: AnySchema,
	property: string,
	instruction: Instruction
): string => {
	const isRoot = property === 'v' && !instruction.fromUnion

	if (
		instruction.cyclicDefs &&
		Kind in schema &&
		schema[Kind] === 'Ref' &&
		schema.$ref &&
		schema.$ref in instruction.cyclicDefs.names
	) {
		const call = `(${property}==null?${property}:${instruction.cyclicDefs.names[schema.$ref]}(${property}))`

		return isRoot ? `return ${call}` : call
	}

	if (Kind in schema && schema[Kind] === 'Intersect' && schema.allOf)
		schema = mergeObjectIntersection(schema)

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
			if (schema[Kind] === 'Record') {
				v = handleRecord(schema as TRecord, property, instruction)

				break
			}

			schema = mergeObjectIntersection(schema)

			// without properties there is nothing to strip, pass as-is
			if (!schema.properties) {
				v = property
				break
			}

			v += '{'

			if (schema.additionalProperties) v += `...${property},`

			const keys = Object.keys(schema.properties!)
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i]

				let isOptional =
					// all fields are optional
					!schema.required ||
					// field is explicitly required
					(schema.required && !schema.required.includes(key)) ||
					Array.isArray(schema.properties![key].anyOf)

				const name = joinProperty(
					property,
					key,
					// If parent is a union, any property could be undefined
					instruction.parentIsOptional || instruction.fromUnion
				)

				if (isOptional) {
					const index = instruction.array

					if (property.startsWith('ar')) {
						const dotIndex = name.indexOf('.')
						let refName
						if (dotIndex >= 0) {
							// Has a dot, extract from the dot onwards
							refName = name.slice(dotIndex)
						} else {
							// No dot, must be bracket notation
							refName = name.slice(property.length)
						}
						const array = instruction.optionalsInArray

						if (array[index]) {
							array[index].push(refName)
						} else {
							array[index] = [refName]
						}
					} else {
						instruction.optionals.push(name)
					}
				}

				const child = schema.properties![key]

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
			// without items constraint there is nothing to strip, pass as-is
			if (!schema.items) {
				v = property
				break
			}

			if (
				// @ts-expect-error
				schema.items.type !== 'object' &&
				// @ts-expect-error
				schema.items.type !== 'array'
			) {
				const cyclicItems =
					instruction.cyclicDefs !== undefined &&
					!Array.isArray(schema.items) &&
					Kind in schema.items! &&
					schema.items[Kind] === 'Ref' &&
					schema.items.$ref !== undefined &&
					schema.items.$ref in instruction.cyclicDefs.names

				// a scalar codec leaf as items must transform per element, so
				// it can't take the identity shortcuts below
				const codecItems =
					instruction.transform !== undefined &&
					!Array.isArray(schema.items) &&
					Codec in schema.items!

				if (Array.isArray(schema.items)) {
					v = handleTuple(schema.items, property, instruction)
					break
				} else if (!cyclicItems && !codecItems) {
					// cyclic ref items continue to the loop below,
					// mirroring to a per-item function call
					if (isRoot && !Array.isArray(schema.items!.anyOf))
						return 'return v'
					else if (
						Kind in schema.items! &&
						schema.items.$ref &&
						(schema.items[Kind] === 'Ref' ||
							schema.items[Kind] === 'This')
					)
						v = mirror(
							deepClone(
								instruction.definitions[schema.items.$ref]
							),
							property,
							{
								...instruction,
								parentIsOptional: true,
								recursion: instruction.recursion + 1
							}
						)
					else if (!Array.isArray(schema.items!.anyOf)) {
						v = property
						break
					}
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
				`ar${i}v[i]=${mirror(schema.items as AnySchema, `ar${i}p`, instruction)}`

			const optionals = instruction.optionalsInArray[i + 1]
			if (optionals) {
				// optional index
				for (let oi = 0; oi < optionals.length; oi++) {
					const target = `ar${i}v[i]${optionals[oi]}`

					v += `;if(${target}===undefined)delete ${target}`
				}
				// Clear the optionals array after use to prevent pollution across sibling arrays
				instruction.optionalsInArray[i + 1] = []
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
		v += `)delete x${shouldQuestion ? (prop.charCodeAt(0) === 91 ? '?.' : '?') : ''}${prop}\n`
	}

	return `${v}return x`
}

export interface Manifest {
	source: string
	externals: {
		unions: Validator<any, TSchema, unknown, unknown>[][]
		codecs?: Function[]
		hof?: Record<string, Function>
	}
}

export const createMirror = <T extends TSchema, Emit extends boolean = false>(
	schema: T,
	{
		Compile,
		modules,
		definitions,
		sanitize,
		recursionLimit = 8,
		removeUnknownUnionType = false,
		emit,
		decode,
		encode
	}: Partial<
		Pick<
			Instruction<Emit>,
			| 'Compile'
			| 'definitions'
			| 'sanitize'
			| 'modules'
			| 'recursionLimit'
			| 'removeUnknownUnionType'
			| 'emit'
		>
	> & {
		/**
		 * Apply each codec's `~codec.decode` at codec leaves (parse input,
		 * e.g. numeric string → number) on top of the clean walk
		 *
		 * The value is assumed to have already passed `Check`
		 *
		 * @default false
		 */
		decode?: boolean
		/**
		 * Apply each codec's `~codec.encode` at codec leaves
		 *
		 * @default false
		 */
		encode?: boolean
	} = Object.create(null)
): Emit extends true ? Manifest : (v: Static<T>) => Static<T> => {
	const unions = <Instruction['unions']>[]
	const codecs: Function[] = []
	const cyclic: CyclicContext = { groups: new Map(), fns: [], count: 0 }

	if (typeof sanitize === 'function') sanitize = [sanitize]

	const f = mirror(schema as any, 'v', {
		optionals: [],
		optionalsInArray: [],
		array: 0,
		parentIsOptional: false,
		unions,
		unionKeys: Object.create(null),
		Compile,
		modules,
		// @ts-ignore private property
		definitions: definitions ?? modules?.$defs ?? Object.create(null),
		cyclic,
		sanitize,
		recursion: 0,
		recursionLimit,
		removeUnknownUnionType,
		// decode takes precedence if both are passed
		transform: decode ? 'decode' : encode ? 'encode' : undefined,
		codecs
	})

	const fns = cyclic.fns.length ? cyclic.fns.join('\n') + '\n' : ''

	if (!unions.length && !sanitize?.length && !codecs.length) {
		if (emit) return { source: fns + f, externals: undefined } as any

		return Function('v', fns + f) as any
	}

	let hof: Record<string, Function> | undefined
	if (sanitize?.length) {
		hof = Object.create(null)
		for (let i = 0; i < sanitize.length; i++) hof![`h${i}`] = sanitize[i]
	}

	const source = `${fns}return function mirror(v){${f}}`

	if (emit)
		return {
			source,
			externals: {
				unions,
				codecs: codecs.length ? codecs : undefined,
				hof
			}
		} as any

	const d: Record<string, unknown> = Object.create(null)
	if (unions.length) d.unions = unions
	if (codecs.length) d.codecs = codecs
	if (hof) Object.assign(d, hof)

	return Function('d', source)(d) as any
}

export default createMirror
