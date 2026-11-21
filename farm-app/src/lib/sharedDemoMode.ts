export const isPublicDemoRoute = typeof window !== 'undefined'
  && /^\/demo(?:\/|$)/.test(window.location.pathname)

export function localDatabaseName(name: string) {
  return isPublicDemoRoute ? `${name}-public-demo` : name
}
