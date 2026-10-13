export function formatTime(ts: number, withSeconds = false): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
  })
}
