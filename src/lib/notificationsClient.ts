'use client'

import { callApi } from '@/lib/apiClient'

// Client helpers for the admin notifications (bell + chat icon in the header).
export const NOTIFICATIONS_REFRESH_EVENT = 'klarfix-notifications-refresh'

// Ask every mounted bell to reload its counts right away (after reading a chat, opening a request, approving a partner …).
export function refreshAdminNotifications() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT))
}

export async function markAdminNotificationRead(id: string) {
  await callApi('admin', '/api/admin/notifications', 'POST', { action: 'read', id })
  refreshAdminNotifications()
}
