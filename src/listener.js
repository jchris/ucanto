import * as API from "./api.js"

/**
 * Creates a connection to a service.
 *
 * @template Service
 * @param {API.Handler<Service>} options
 * @returns {API.HandlerView<Service>}
 */
export const handler = options => new Handler(options)

/**
 * @template Service
 * @implements {API.HandlerView<Service>}
 */
class Handler {
  /**
   * @param {API.Handler<Service>} options
   */
  constructor(options) {
    this.options = options
    this.decoder = options.decoder
    this.encoder = options.encoder
    this.service = options.service
  }
  /**
   * @template {API.ServiceInvocations<Service>[]} I
   * @param {API.Batch<I>} batch
   * @returns {API.Await<API.ExecuteBatchInvocation<I, Service>>}
   */
  execute(batch) {
    const result = execute(this, batch)
    return result
  }
  /**
   * @template {API.ServiceInvocations<Service>[]} I
   * @param {API.Transport.HTTPRequest<API.Batch<I>>} request
   * @returns {API.Await<API.Transport.HTTPResponse<API.ExecuteBatchInvocation<I, Service>>>}
   */
  handle(request) {
    return handle(this, request)
  }
}

/**
 * @template Service
 * @template {API.ServiceInvocations<Service>[]} I
 * @param {API.HandlerView<Service>} handler
 * @param {API.Transport.HTTPRequest<API.Batch<I>>} request
 * @returns {Promise<API.Transport.HTTPResponse<API.ExecuteBatchInvocation<I, Service>>>}
 */
export const handle = async (handler, request) => {
  const batch = await handler.decoder.decode(request)
  const result = await execute(handler, batch)
  return handler.encoder.encode(result)
}

/**
 * @template Service
 * @template {API.ServiceInvocations<Service>[]} I
 * @param {API.HandlerView<Service>} handler
 * @param {API.Batch<I>} request
 * @returns {Promise<API.ExecuteBatchInvocation<I, Service>>}
 */
export const execute = async ({ service }, { invocations }) => {
  const results = []
  for (const invocation of invocations) {
    results.push(await invoke(service, invocation))
  }
  return /** @type {API.ExecuteBatchInvocation<I, Service>} */ (results)
}

/**
 * @template {API.Invocation[]} I
 * @template {API.BatchInvocationService<I>} Service
 * @param {Service} service
 * @param {I[number]} invocation
 */
export const invoke = async (service, invocation) => {
  const { capability } = invocation
  const path = capability.can.split("/")
  const method = /** @type {string} */ (path.pop())
  const handler = resolve(service, path)
  if (handler == null || typeof handler[method] !== "function") {
    return {
      ok: false,
      error: new RangeError(
        `service does not have a handler for ${capability.can}`
      ),
    }
  } else {
    try {
      return await handler[method](invocation)
    } catch (error) {
      return { ok: false, error: error }
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