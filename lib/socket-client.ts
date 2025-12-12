import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

const sanitizeUrl = (value: string | undefined | null) => {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  // strip trailing slash for consistency
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "")

  // If the provided URL points at an API route (e.g. /api/v1), drop the path portion
  const apiSegmentIndex = withoutTrailingSlash.indexOf("/api/")
  if (apiSegmentIndex !== -1) {
    return withoutTrailingSlash.slice(0, apiSegmentIndex)
  }

  return withoutTrailingSlash
}

export const getSocket = () => {
  if (socket) return socket

  const url =
    sanitizeUrl(process.env.NEXT_PUBLIC_SOCKET_URL) ||
    sanitizeUrl(process.env.NEXT_PUBLIC_SOCKET_BASE_URL) ||
    sanitizeUrl(process.env.NEXT_PUBLIC_BASE_URL)

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SOCKET_URL or NEXT_PUBLIC_SOCKET_BASE_URL")
  }

  socket = io(url, {
    transports: ["websocket"],
    withCredentials: true,
  })

  return socket
}
