// Cliente HTTP centralizado — todas as chamadas à API passam por aqui

const BASE_URL = ''

interface ApiResponse<T = unknown> {
  success: boolean
  error?: string
  [key: string]: unknown
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function requisitar<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token')

  // Para FormData, não definir Content-Type — o browser define o boundary automaticamente
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Token expirado — tentar refresh automático
  if (res.status === 401) {
    const renovado = await tentarRefresh()
    if (renovado) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('access_token')}`
      const retentativa = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
      if (!retentativa.ok) {
        const erro = await retentativa.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new ApiError(retentativa.status, erro.error ?? 'Erro na requisição')
      }
      return retentativa.json()
    } else {
      // Refresh falhou — redirecionar para login
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/auth/login'
      throw new ApiError(401, 'Sessão expirada')
    }
  }

  if (!res.ok) {
    const erro = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new ApiError(res.status, erro.error ?? 'Erro na requisição')
  }

  return res.json()
}

async function tentarRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return false

  try {
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) return false

    const data = await res.json()
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    return true
  } catch {
    return false
  }
}

export const api = {
  get: <T>(endpoint: string) => requisitar<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    requisitar<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown) =>
    requisitar<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown) =>
    requisitar<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => requisitar<T>(endpoint, { method: 'DELETE' }),
  // Upload multipart — body FormData detectado automaticamente (sem Content-Type fixo)
  postForm: <T>(endpoint: string, formData: FormData) =>
    requisitar<T>(endpoint, { method: 'POST', body: formData }),
}

export { ApiError }
