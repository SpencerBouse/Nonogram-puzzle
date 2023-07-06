export function inRange(value, first, last){
  const min = Math.min(first,last)
  const max = Math.max(first,last)

  return value >= min && value <= max
}

export function isEqual(value, first, last){
  return value===first && value===last
}