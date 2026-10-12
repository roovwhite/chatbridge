import styles from './Avatar.module.css'

// стабильный оттенок из строки, чтобы у чата всегда был один и тот же цвет
function hueOf(s: string): number {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export function Avatar({ id, name, size = 48 }: { id: string; name: string; size?: number }) {
  const hue = hueOf(id)
  const initials = /\d/.test(name[0] ?? '') ? '#' : name.trim().slice(0, 2).toUpperCase()
  return (
    <div
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${(hue + 40) % 360} 80% 55%))`,
      }}
    >
      {initials}
    </div>
  )
}
