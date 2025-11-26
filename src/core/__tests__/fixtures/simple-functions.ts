/**
 * Test fixture: Simple exported functions
 */

export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export async function fetchData(_url: string): Promise<string> {
  return 'data';
}

// This should NOT be extracted (not exported)
function _privateHelper(): void {
  console.log('private');
}

export function multiply(x: number, y: number): number {
  return x * y;
}
