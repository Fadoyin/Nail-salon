export function penceToPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export function calculateDeposit(totalPence: number, percentage: number): number {
  return Math.round(totalPence * (percentage / 100));
}
