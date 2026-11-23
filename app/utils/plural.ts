/** «1 entregable» / «3 entregables»: el número con su sustantivo en singular o plural. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}
