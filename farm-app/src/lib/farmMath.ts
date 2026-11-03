export function acceptedOutput(harvested: number, rejected: number) {
  return Math.max(0, harvested - rejected)
}
