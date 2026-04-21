import { sendConversaMessage, callSonnet } from '@/lib/api'

const mkResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response

const fetchMock = jest.fn()

describe('api retry with backoff', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    fetchMock.mockReset()
    ;(global as unknown as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  test('returns immediately on 2xx', async () => {
    fetchMock.mockResolvedValue(mkResponse(200, { response: 'hola' }))
    const result = await sendConversaMessage([], 'test')
    expect(result).toEqual({ response: 'hola' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('retries on 5xx then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(mkResponse(503, {}))
      .mockResolvedValueOnce(mkResponse(500, {}))
      .mockResolvedValueOnce(mkResponse(200, { response: 'ok' }))

    const promise = sendConversaMessage([], 'test')
    await jest.advanceTimersByTimeAsync(500)
    await jest.advanceTimersByTimeAsync(1000)
    const result = await promise

    expect(result).toEqual({ response: 'ok' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  test('does NOT retry on 4xx', async () => {
    fetchMock.mockResolvedValue(mkResponse(400, {}))
    await expect(sendConversaMessage([], 'test')).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('throws after exhausting retries on persistent 5xx', async () => {
    fetchMock.mockResolvedValue(mkResponse(500, {}))

    const promise = sendConversaMessage([], 'test')
    promise.catch(() => {})
    await jest.advanceTimersByTimeAsync(500)
    await jest.advanceTimersByTimeAsync(1000)
    await jest.advanceTimersByTimeAsync(2000)

    await expect(promise).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(4) // 1 inicial + 3 reintentos
  })

  test('retries on network error then succeeds', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(mkResponse(200, { result: 'hi' }))

    const promise = callSonnet('x', {})
    await jest.advanceTimersByTimeAsync(500)
    const result = await promise

    expect(result).toBe('hi')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
