const n = 16
const cx = 12, cy = 12
const R = 7.5, r = 6.0
const pts = []
for (let i = 0; i < n * 2; i++) {
  const angle = (i * Math.PI) / n - Math.PI / 2
  const radius = i % 2 === 0 ? R : r
  const x = (cx + radius * Math.cos(angle)).toFixed(2)
  const y = (cy + radius * Math.sin(angle)).toFixed(2)
  pts.push((i === 0 ? 'M' : 'L') + x + ',' + y)
}
pts.push('Z')
console.log(pts.join(' '))
