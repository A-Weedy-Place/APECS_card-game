// Reproducible game randomness, not a cryptographic random number generator.
// The server chooses a cryptographic seed and never exposes it to the client.
export function randomAt(seed: number, salt: number): number {
  let value = (seed + Math.imul(salt + 1, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967296;
}
