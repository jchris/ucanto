import * as API from '@ucanto/interface'
import { InvalidAudience } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
export {
  capability,
  URI,
  Link,
  Failure,
  MalformedCapability,
} from '@ucanto/validator'

/**
 * Creates a connection to a service.
 *
 * @template {Record<string, any>} Service
 * @param {API.Server<Service>} options
 * @returns {API.ServerView<Service>}
 */
export const create = options => new Server(options)

/**
 * @template {Record<string, any>} Service
 * @implements {API.ServerView<Service>}
 */
class Server {
  /**
   * @param {API.Server<Service>} options
   */
  constructor({
    id,
    service,
    encoder,
    decoder,
    principal = Verifier,
    canIssue = (capability, issuer) =>
      capability.with === issuer || issuer === id.did(),
    ...rest
  }) {
    const { catch: fail, ...context } = rest
    this.context = { id, principal, canIssue, ...context }
    this.service = service
    this.encoder = encoder
    this.decoder = decoder
    this.catch = fail || (() => {})
  }
  get id() {
    return this.context.id
  }

  /**
   * @template {API.Capability} C
   * @template {API.Tuple<API.ServiceInvocation<C, Service>>} I
   * @param {API.HTTPRequest<I>} request
   * @returns {API.Await<API.HTTPResponse<API.InferServiceInvocations<I, Service>>>}
   */
  request(request) {
    return handle(/** @type {API.ServerView<Service>} */ (this), request)
  }
}

/**
 * @template {Record<string, any>} T
 * @template {API.Capability} C
 * @template {API.Tuple<API.ServiceInvocation<C, T>>} I
 * @param {API.ServerView<T>} server
 * @param {API.HTTPRequest<I>} request
 * @returns {Promise<API.HTTPResponse<API.InferServiceInvocations<I, T>>>}
 */
export const handle = async (server, request) => {
  const invocations = await server.decoder.decode(request)
  const result = await execute(invocations, server)
  return server.encoder.encode(result)
}

/**
 * @template {Record<string, any>} Service
 * @template {API.Capability} C
 * @template {API.Tuple<API.ServiceInvocation<C, Service>>} I
 * @param {API.InferInvocations<I>} invocations
 * @param {API.ServerView<Service>} server
 * @returns {Promise<API.InferServiceInvocations<I, Service>>}
 */
export const execute = async (invocations, server) => {
  const results = []
  const input =
    /** @type {API.InferInvocation<API.ServiceInvocation<C, Service>>[]} */ (
      invocations
    )
  for (const invocation of input) {
    results.push(await invoke(invocation, server))
  }

  return /** @type {API.InferServiceInvocations<I, Service>} */ (results)
}

/**
 * @template {Record<string, any>} Service
 * @template {API.Capability} C
 * @param {API.InferInvocation<API.ServiceInvocation<C, Service>>} invocation
 * @param {API.ServerView<Service>} server
 * @returns {Promise<API.InferServiceInvocationReturn<C, Service>>}
 */
export const invoke = async (invocation, server) => {
  // If invocation is not for our server respond with error
  if (invocation.audience.did() !== server.id.did()) {
    return /** @type {API.Result<any, API.InvalidAudience>} */ (
      new InvalidAudience(server.id, invocation)
    )
  }

  // Invocation needs to have one single capability
  if (invocation.capabilities.length !== 1) {
    return /** @type {API.Result<any, InvocationCapabilityError>} */ (
      new InvocationCapabilityError(invocation.capabilities)
    )
  }

  const [capability] = invocation.capabilities

  const path = capability.can.split('/')
  const method = /** @type {string} */ (path.pop())
  const handler = resolve(server.service, path)
  if (handler == null || typeof handler[method] !== 'function') {
    return /** @type {API.Result<any, API.HandlerNotFound>} */ (
      new HandlerNotFound(capability)
    )
  } else {
    try {
      return await handler[method](invocation, server.context)
    } catch (error) {
      const err = new HandlerExecutionError(
        capability,
        /** @type {Error} */ (error)
      )

      server.catch(err)

      return /** @type {API.Result<any, API.HandlerExecutionError>} */ (err)
    }
  }
}

/**
 * @implements {API.HandlerNotFound}
 */
export class HandlerNotFound extends RangeError {
  /**
   * @param {API.Capability} capability
   */
  constructor(capability) {
    super()
    /** @type {true} */
    this.error = true
    this.capability = capability
  }
  /** @type {'HandlerNotFound'} */
  get name() {
    return 'HandlerNotFound'
  }
  get message() {
    return `service does not implement {can: "${this.capability.can}"} handler`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      capability: {
        can: this.capability.can,
        with: this.capability.with,
      },
      message: this.message,
      stack: this.stack,
    }
  }
}

class HandlerExecutionError extends Error {
  /**
   * @param {API.ParsedCapability} capability
   * @param {Error} cause
   */
  constructor(capability, cause) {
    super()
    this.capability = capability
    this.cause = cause
    /** @type { true } */
    this.error = true
  }

  /** @type {'HandlerExecutionError'} */
  get name() {
    return 'HandlerExecutionError'
  }
  get message() {
    return `service handler {can: "${this.capability.can}"} error: ${this.cause.message}`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      capability: {
        can: this.capability.can,
        with: this.capability.with,
      },
      cause: {
        ...this.cause,
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      },
      message: this.message,
      stack: this.stack,
    }
  }
}

class InvocationCapabilityError extends Error {
  /**
   * @param {any} caps
   */
  constructor(caps) {
    super()
    /** @type {true} */
    this.error = true
    this.caps = caps
  }
  get name() {
    return 'InvocationCapabilityError'
  }
  get message() {
    return `Invocation is required to have a single capability.`
  }
  toJSON() {
    return {
      name: this.name,
      error: this.error,
      message: this.message,
      capabilities: this.caps,
    }
  }
}

/**
 * @param {Record<string, any>} service
 * @param {string[]} path
 */

const resolve = (service, path) => {
  let target = service
  for (const key of path) {
    target = target[key]
    if (!target) {
      return null
    }
  }
  return target
}
