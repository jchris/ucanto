import { test, assert } from './test.js'
import * as Schema from '../src/schema.js'
import fixtures from './schema/fixtures.js'

for (const { input, schema, expect, inputLabel, skip, only } of fixtures()) {
  const unit = skip ? test.skip : only ? test.only : test

  unit(`${schema}.read(${inputLabel})`, () => {
    const result = schema.read(input)

    if (expect.error) {
      assert.match(String(result), expect.error)
    } else {
      assert.deepEqual(
        result,
        // if expected value is set to undefined use input
        expect.value === undefined ? input : expect.value
      )
    }
  })

  unit(`${schema}.from(${inputLabel})`, () => {
    if (expect.error) {
      assert.throws(() => schema.from(input), expect.error)
    } else {
      assert.deepEqual(
        schema.from(input),
        // if expected value is set to undefined use input
        expect.value === undefined ? input : expect.value
      )
    }
  })

  unit(`${schema}.is(${inputLabel})`, () => {
    assert.equal(schema.is(input), !expect.error)
  })
}

test('string startsWith & endsWith', () => {
  const impossible = Schema.string().startsWith('hello').startsWith('hi')
  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.equal(
    impossible.toString(),
    'string().refine(startsWith("hello")).refine(startsWith("hi"))'
  )

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string().startsWith('hello').startsWith('hello ')
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.equal(hello.read('hello world'), 'hello world')
})

test('string startsWith', () => {
  /** @type {Schema.StringSchema<`hello${string}`>} */
  // @ts-expect-error - catches invalid type
  const bad = Schema.string()

  /** @type {Schema.StringSchema<`hello${string}`>} */
  const hello = Schema.string().startsWith('hello')

  assert.equal(hello.read('hello world!'), 'hello world!')
  assert.deepInclude(hello.read('hi world'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world"`,
  })
})

test('string endsWith', () => {
  /** @type {Schema.StringSchema<`${string} world`>} */
  // @ts-expect-error - catches invalid type
  const bad = Schema.string()

  /** @type {Schema.StringSchema<`${string} world`>} */
  const greet = Schema.string().endsWith(' world')

  assert.equal(greet.read('hello world'), 'hello world')
  assert.equal(greet.read('hi world'), 'hi world')
  assert.deepInclude(greet.read('hello world!'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to end with " world" instead got "hello world!"`,
  })
})

test('string startsWith/endsWith', () => {
  /** @type {Schema.StringSchema<`hello${string}!`>} */
  // @ts-expect-error - catches invalid type
  const bad = Schema.string()

  /** @type {Schema.StringSchema<`hello${string}` & `${string}!`>} */
  const hello1 = Schema.string().startsWith('hello').endsWith('!')
  /** @type {Schema.StringSchema<`hello${string}` & `${string}!`>} */
  const hello2 = Schema.string().endsWith('!').startsWith('hello')

  assert.equal(
    hello1.toString(),
    `string().refine(startsWith("hello")).refine(endsWith("!"))`
  )
  assert.equal(
    hello2.toString(),
    `string().refine(endsWith("!")).refine(startsWith("hello"))`
  )

  assert.equal(hello1.read('hello world!'), 'hello world!')
  assert.equal(hello2.read('hello world!'), 'hello world!')
  assert.deepInclude(hello1.read('hello world'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to end with "!" instead got "hello world"`,
  })
  assert.deepInclude(hello2.read('hello world'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to end with "!" instead got "hello world"`,
  })
  assert.deepInclude(hello1.read('hi world!'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world!"`,
  })
  assert.deepInclude(hello2.read('hi world!'), {
    error: true,
    name: 'SchemaError',
    message: `Expect string to start with "hello" instead got "hi world!"`,
  })
})

test('string startsWith & endsWith', () => {
  const impossible = Schema.string().startsWith('hello').startsWith('hi')
  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string().startsWith('hello').startsWith('hello ')
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.equal(hello.read('hello world'), 'hello world')
})

test('string().refine', () => {
  const impossible = Schema.string()
    .refine(Schema.startsWith('hello'))
    .refine(Schema.startsWith('hi'))

  /** @type {Schema.StringSchema<`hello${string}` & `hi${string}`>} */
  const typeofImpossible = impossible

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  assert.deepInclude(impossible.read('hello world'), {
    error: true,
    message: `Expect string to start with "hi" instead got "hello world"`,
  })

  const hello = Schema.string()
    .refine(Schema.startsWith('hello'))
    .refine(Schema.startsWith('hello '))

  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}`>} */
  const typeofHello = hello

  assert.equal(hello.read('hello world'), 'hello world')

  const greet = hello.refine({
    /**
     * @template {string} In
     * @param {In} hello
     */
    read(hello) {
      if (hello.length === 11) {
        return /** @type {In & {length: 11}} */ (hello)
      } else {
        return Schema.error(`Expected string with 11 chars`)
      }
    },
  })
  /** @type {Schema.StringSchema<`hello${string}` & `hello ${string}` & { length: 11 }>} */
  const typeofGreet = greet

  assert.equal(
    greet.read('hello world'),
    /** @type {unknown} */ ('hello world')
  )
  assert.equal(
    greet.read('hello Julia'),
    /** @type {unknown} */ ('hello Julia')
  )

  assert.deepInclude(greet.read('hello Jack'), {
    error: true,
    message: 'Expected string with 11 chars',
  })
})

test('never().default()', () => {
  assert.throws(
    () =>
      Schema.never()
        // @ts-expect-error - no value satisfies default
        .default('hello'),
    /Expected value of type never instead got "hello"/
  )
})

test('literal("foo").default("bar") throws', () => {
  assert.throws(
    () =>
      Schema.literal('foo')
        // @ts-expect-error - no value satisfies default
        .default('bar'),
    /Expected literal "foo" instead got "bar"/
  )
})

test('default on literal has default', () => {
  const schema = Schema.literal('foo').default()
  assert.equal(schema.read(undefined), 'foo')
})

test('literal has value field', () => {
  assert.equal(Schema.literal('foo').value, 'foo')
})

test('.default().optional() is noop', () => {
  const schema = Schema.string().default('hello')
  assert.equal(schema.optional(), schema)
})

test('optional().optional() is noop', () => {
  const schema = Schema.string().optional()
  assert.equal(schema.optional(), schema)
})

test('.element of array', () => {
  const schema = Schema.string()
  assert.equal(Schema.array(schema).element, schema)
})

test('.key & .value of dictionary', () => {
  const value = Schema.struct({})
  const key = Schema.enum(['x', 'y'])
  const schema = Schema.dictionary({ value, key })

  assert.deepEqual(schema.value, value)
  assert.deepEqual(schema.key, key)

  assert.deepEqual(Schema.dictionary({ value }).key, Schema.string())
})

test('struct', () => {
  const Point = Schema.struct({
    type: 'Point',
    x: Schema.integer(),
    y: Schema.integer(),
  })

  const p1 = Point.read({
    x: 1,
    y: 2,
  })
  assert.equal(p1.error, true)

  assert.match(String(p1), /field "type".*expect.*"Point".*got undefined/is)

  const p2 = Point.read({
    type: 'Point',
    x: 1,
    y: 1,
  })
  assert.deepEqual(p2, {
    type: 'Point',
    x: Schema.integer().from(1),
    y: Schema.integer().from(1),
  })

  const p3 = Point.read({
    type: 'Point',
    x: 1,
    y: 1.1,
  })

  assert.equal(p3.error, true)
  assert.match(String(p3), /field "y".*expect.*integer.*got 1.1/is)

  assert.match(
    String(Point.read(['h', 'e', 'l', null, 'l', 'o'])),
    /Expected value of type object instead got array/
  )
})

test('struct with defaults', () => {
  const Point = Schema.struct({
    x: Schema.number().default(0),
    y: Schema.number().default(0),
  })

  assert.deepEqual(Point.read({}), { x: 0, y: 0 })
  assert.deepEqual(Point.read({ x: 2 }), { x: 2, y: 0 })
  assert.deepEqual(Point.read({ x: 2, y: 7 }), { x: 2, y: 7 })
  assert.deepEqual(Point.read({ y: 7 }), { x: 0, y: 7 })
})

test('struct with literals', () => {
  const Point = Schema.struct({
    z: 0,
    x: Schema.number(),
    y: Schema.number(),
  })

  assert.deepEqual(Point.read({ x: 0, y: 0, z: 0 }), { x: 0, y: 0, z: 0 })
  assert.match(
    String(Point.read({ x: 1, y: 1, z: 1 })),
    /"z".*expect.* 0 .* got 1/is
  )
})

test('bad struct def', () => {
  assert.throws(
    () =>
      Schema.struct({
        name: Schema.string(),
        // @ts-expect-error
        toString: () => 'hello',
      }),
    /Invalid struct field "toString", expected schema or literal, instead got function/
  )
})

test('struct with null literal', () => {
  const schema = Schema.struct({ a: null, b: true, c: Schema.string() })

  assert.deepEqual(schema.read({ a: null, b: true, c: 'hi' }), {
    a: null,
    b: true,
    c: 'hi',
  })

  assert.match(
    String(schema.read({ a: null, b: false, c: '' })),
    /"b".*expect.* true .* got false/is
  )

  assert.match(
    String(schema.read({ b: true, c: '' })),
    /"a".*expect.* null .* got undefined/is
  )
})

test('lessThan', () => {
  const schema = Schema.number().lessThan(100)

  assert.deepEqual(schema.read(10), 10)
  assert.match(String(schema.read(127)), /127 < 100/)
  assert.match(String(schema.read(Infinity)), /Infinity < 100/)
  assert.match(String(schema.read(NaN)), /NaN < 100/)
})

test('greaterThan', () => {
  const schema = Schema.number().greaterThan(100)

  assert.deepEqual(schema.read(127), 127)
  assert.match(String(schema.read(12)), /12 > 100/)
  assert.equal(schema.read(Infinity), Infinity)
  assert.match(String(schema.read(NaN)), /NaN > 100/)
})

test('number().greaterThan().lessThan()', () => {
  const schema = Schema.number().greaterThan(3).lessThan(117)

  assert.equal(schema.read(4), 4)
  assert.equal(schema.read(116), 116)
  assert.match(String(schema.read(117)), /117 < 117/)
  assert.match(String(schema.read(3)), /3 > 3/)
  assert.match(String(schema.read(127)), /127 < 117/)
  assert.match(String(schema.read(0)), /0 > 3/)
  assert.match(String(schema.read(Infinity)), /Infinity < 117/)
  assert.match(String(schema.read(NaN)), /NaN > 3/)
})

test('enum', () => {
  const schema = Schema.enum(['Red', 'Green', 'Blue'])
  assert.equal(schema.toString(), 'Red|Green|Blue')
  assert.equal(schema.read('Red'), 'Red')
  assert.equal(schema.read('Blue'), 'Blue')
  assert.equal(schema.read('Green'), 'Green')

  assert.match(
    String(schema.read('red')),
    /expect.* Red\|Green\|Blue .* got "red"/is
  )
  assert.match(String(schema.read(5)), /expect.* Red\|Green\|Blue .* got 5/is)
})

test('tuple', () => {
  const schema = Schema.tuple([Schema.string(), Schema.integer()])
  assert.match(
    String(schema.read([, undefined])),
    /invalid element at 0.*expect.*string.*got undefined/is
  )
  assert.match(
    String(schema.read([0, 'hello'])),
    /invalid element at 0.*expect.*string.*got 0/is
  )
  assert.match(
    String(schema.read(['0', '1'])),
    /invalid element at 1.*expect.*number.*got "1"/is
  )
  assert.match(
    String(schema.read(['0', Infinity])),
    /invalid element at 1.*expect.*integer.*got Infinity/is
  )
  assert.match(
    String(schema.read(['0', NaN])),
    /invalid element at 1.*expect.*integer.*got NaN/is
  )
  assert.match(
    String(schema.read(['0', 0.2])),
    /invalid element at 1.*expect.*integer.*got 0.2/is
  )

  assert.deepEqual(schema.read(['x', 0]), ['x', 0])
})

test('extend API', () => {
  {
    /**
     * @template {string} M
     * @implements {Schema.Schema<`did:${M}:${string}`, string>}
     * @extends {Schema.API<`did:${M}:${string}`, string, M>}
     */
    class DIDString extends Schema.API {
      /**
       * @param {string} source
       * @param {M} method
       */
      readWith(source, method) {
        const string = String(source)
        if (string.startsWith(`did:${method}:`)) {
          return /** @type {`did:${M}:${string}`} */ (method)
        } else {
          return Schema.error(
            `Expected did:${method} URI instead got ${string}`
          )
        }
      }
    }

    const schema = new DIDString('key')
    assert.equal(schema.toString(), 'new DIDString()')
    assert.match(
      String(
        // @ts-expect-error
        schema.read(54)
      ),
      /Expected did:key URI/
    )

    assert.match(
      String(schema.read('did:echo:foo')),
      /Expected did:key URI instead got did:echo:foo/
    )

    const didKey = Schema.string().refine(new DIDString('key'))
    assert.match(String(didKey.read(54)), /Expect.* string instead got 54/is)
  }
})

test('errors', () => {
  const error = Schema.error('boom!')
  const json = JSON.parse(JSON.stringify(error))
  assert.deepInclude(json, {
    name: 'SchemaError',
    message: 'boom!',
    error: true,
    stack: error.stack,
  })

  assert.equal(error instanceof Error, true)
})

test('refine', () => {
  /**
   * @template T
   */
  class NonEmpty extends Schema.API {
    /**
     * @param {T[]} array
     */
    read(array) {
      return array.length > 0
        ? array
        : Schema.error('Array expected to have elements')
    }
  }

  const schema = Schema.array(Schema.string()).refine(new NonEmpty())

  assert.equal(schema.toString(), 'array(string()).refine(new NonEmpty())')
  assert.match(String(schema.read([])), /Array expected to have elements/)
  assert.deepEqual(schema.read(['hello', 'world']), ['hello', 'world'])
  assert.match(String(schema.read(null)), /expect.* array .*got null/is)
})

test('brand', () => {
  const digit = Schema.integer()
    .refine({
      read(n) {
        return n >= 0 && n <= 9
          ? n
          : Schema.error(`Expected digit but got ${n}`)
      },
    })
    .brand('digit')

  assert.match(String(digit.read(10)), /Expected digit but got 10/)
  assert.match(String(digit.read(2.7)), /Expected value of type integer/)
  assert.equal(digit.from(2), 2)

  /** @param {Schema.Infer<typeof digit>} n */
  const fromDigit = n => n

  const three = digit.from(3)

  // @ts-expect-error - 3 is not known to be digit
  fromDigit(3)
  fromDigit(three)

  /** @type {Schema.Integer} */
  const is_int = three
  /** @type {Schema.Branded<number, "digit">} */
  const is_digit = three
  /** @type {Schema.Branded<Schema.Integer, "digit">} */
  const is_int_digit = three
})

test('optional.default removes undefined from type', () => {
  const schema1 = Schema.string().optional()

  /** @type {Schema.Schema<string>} */
  // @ts-expect-error - Schema<string | undefined> is not assignable
  const castError = schema1

  const schema2 = schema1.default('')
  /** @type {Schema.Schema<string>} */
  const castOk = schema2

  assert.equal(schema1.read(undefined), undefined)
  assert.equal(schema2.read(undefined), '')
})

test('.default("one").default("two")', () => {
  const schema = Schema.string().default('one').default('two')

  assert.equal(schema.value, 'two')
  assert.deepEqual(schema.read(undefined), 'two')
  assert.deepEqual(schema.read('three'), 'three')
})

test('default throws on invalid default', () => {
  assert.throws(
    () =>
      Schema.string().default(
        // @ts-expect-error - number is not assignable to string
        101
      ),
    /expect.* string .* got 101/is
  )
})

test('unknown with default', () => {
  assert.throws(
    () => Schema.unknown().default(undefined),
    /undefined is not a vaild default/
  )
})

test('default swaps undefined even if decodes to undefined', () => {
  /** @type {Schema.Schema} */
  const schema = Schema.unknown().refine({
    read(value) {
      return value === null ? undefined : value
    },
  })

  assert.equal(schema.default('X').read(null), 'X')
})

test('record defaults', () => {
  const Point = Schema.struct({
    x: Schema.integer().default(1),
    y: Schema.integer().optional(),
  })

  const Point3D = Point.extend({
    z: Schema.integer(),
  })

  assert.match(
    String(Point.read(undefined)),
    /expect.* object .* got undefined/is
  )
  assert.deepEqual(Point.create(), {
    x: 1,
  })
  assert.deepEqual(Point.create(undefined), {
    x: 1,
  })

  assert.deepEqual(Point.read({}), {
    x: 1,
  })

  assert.deepEqual(Point.read({ y: 2 }), {
    x: 1,
    y: 2,
  })

  assert.deepEqual(Point.read({ x: 2, y: 2 }), {
    x: 2,
    y: 2,
  })

  const Line = Schema.struct({
    start: Point.default({ x: 0 }),
    end: Point.default({ x: 1, y: 3 }),
  })

  assert.deepEqual(Line.create(), {
    start: { x: 0 },
    end: { x: 1, y: 3 },
  })
})
