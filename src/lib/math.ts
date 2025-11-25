/**
 * Computes (base^exponent) % modulus efficiently.
 * Standard Math.pow cannot handle BigInts or modular arithmetic.
 */
export function modPow(
  base: bigint,
  exponent: bigint,
  modulus: bigint
): bigint {
  let result = BigInt(1);
  base = base % modulus;

  while (exponent > BigInt(0)) {
    if (exponent % BigInt(2) === BigInt(1)) {
      result = (result * base) % modulus;
    }
    exponent = exponent / BigInt(2); // integer division
    base = (base * base) % modulus;
  }
  return result;
}

/**
 * Extended Euclidean Algorithm to find the Greatest Common Divisor
 * and the coefficients x, y such that ax + by = gcd(a, b).
 */
function extendedGCD(
  a: bigint,
  b: bigint
): { gcd: bigint; x: bigint; y: bigint } {
  if (a === BigInt(0)) {
    return { gcd: b, x: BigInt(0), y: BigInt(1) };
  }
  const { gcd, x: x1, y: y1 } = extendedGCD(b % a, a);
  const x = y1 - (b / a) * x1;
  const y = x1;
  return { gcd, x, y };
}

/**
 * Calculates the Modular Multiplicative Inverse using Extended GCD.
 * Finds 'd' such that (d * e) % phi = 1.
 */
export function modInverse(e: bigint, phi: bigint): bigint {
  const { gcd, x } = extendedGCD(e, phi);
  if (gcd !== BigInt(1)) {
    throw new Error(
      "Modular inverse does not exist (e and phi are not coprime)."
    );
  }
  // Ensure the result is positive
  return ((x % phi) + phi) % phi;
}

/**
 * Generates a random BigInt with a specific number of bits.
 */
export function generateRandomBigInt(bits: number): bigint {
  const byteLength = Math.ceil(bits / 8);
  const randomBytes = new Uint8Array(byteLength);
  crypto.getRandomValues(randomBytes);

  // Mask the most significant byte to ensure correct bit length
  // and ensure the most significant bit is 1 so it's actually 'bits' long.
  const mask = (1 << bits % 8) - 1 || 0xff;
  randomBytes[0] &= mask;
  randomBytes[0] |= 1 << (bits - 1) % 8;

  let result = BigInt(0);
  for (const byte of randomBytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result;
}

/**
 * Miller-Rabin Primality Test.
 * Probabilistically determines if a number is prime.
 */
export function isPrime(n: bigint, k: number = 5): boolean {
  if (n <= BigInt(1) || n === BigInt(4)) return false;
  if (n <= BigInt(3)) return true;

  // Find d such that n-1 = d * 2^r
  let d = n - BigInt(1);
  while (d % BigInt(2) === BigInt(0)) {
    d /= BigInt(2);
  }

  // Run the test k times
  for (let i = 0; i < k; i++) {
    // Pick a random 'a' in range [2, n - 2]
    // Simplified random generation for the test witness
    const a = BigInt(2) + (generateRandomBigInt(32) % (n - BigInt(4)));

    let x = modPow(a, d, n);
    if (x === BigInt(1) || x === n - BigInt(1)) continue;

    let continueLoop = false;
    let tempD = d;
    while (tempD !== n - BigInt(1)) {
      x = (x * x) % n;
      tempD *= BigInt(2);

      if (x === BigInt(1)) return false;
      if (x === n - BigInt(1)) {
        continueLoop = true;
        break;
      }
    }
    if (!continueLoop) return false;
  }
  return true;
}

/**
 * Generates a large prime number of specified bit length.
 */
export function generatePrime(bits: number): bigint {
  while (true) {
    const candidate = generateRandomBigInt(bits);
    // Ensure it is odd
    if (candidate % BigInt(2) === BigInt(0)) continue;
    if (isPrime(candidate)) return candidate;
  }
}
