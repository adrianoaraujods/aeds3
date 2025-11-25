import { generatePrime, modInverse, modPow } from "@/lib/math";

export type PublicKey = {
  e: bigint;
  n: bigint;
};

export type PrivateKey = {
  d: bigint;
  n: bigint;
};

export type KeyPair = {
  publicKey: PublicKey;
  privateKey: PrivateKey;
};

export class RSA {
  /**
   * Generates RSA public and private keys.
   * @param bitLength The bit length for the primes p and q (e.g., 512, 1024).
   */
  public static generateKeys(bitLength: number = 512): KeyPair {
    let p: bigint, q: bigint;
    const e = BigInt(65537); // Standard public exponent (fermat prime F4)

    // 1. Generate two distinct primes p and q
    do {
      p = generatePrime(bitLength);
      q = generatePrime(bitLength);
    } while (p === q);

    // 2. Compute n = p * q
    const n = p * q;

    // 3. Compute Euler's Totient function phi(n) = (p-1)*(q-1)
    const phi = (p - BigInt(1)) * (q - BigInt(1));

    // 4. Compute d (private exponent)
    // d must be the modular inverse of e modulo phi
    const d = modInverse(e, phi);

    return {
      publicKey: { e, n },
      privateKey: { d, n },
    };
  }

  /**
   * Encrypts a string message using the Public Key.
   * Formula: c = m^e mod n
   */
  public static encrypt(message: string, publicKey: PublicKey): bigint {
    const { e, n } = publicKey;

    const messageBigInt = this.textToBigInt(message);

    if (messageBigInt >= n) {
      throw new Error("Message is too long for the key size.");
    }

    const cipherText = modPow(messageBigInt, e, n);

    return cipherText;
  }

  /**
   * Decrypts a BigInt cipher using the Private Key.
   * Formula: m = c^d mod n
   */
  public static decrypt(cipher: bigint, privateKey: PrivateKey): string {
    const { d, n } = privateKey;

    const decryptedBigInt = modPow(cipher, d, n);

    return this.bigIntToText(decryptedBigInt);
  }

  private static textToBigInt(text: string): bigint {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    let result = BigInt(0);
    for (const byte of bytes) {
      result = (result << BigInt(8)) + BigInt(byte);
    }
    return result;
  }

  private static bigIntToText(num: bigint): string {
    let temp = num;
    const bytes: number[] = [];
    while (temp > BigInt(0)) {
      bytes.unshift(Number(temp & BigInt(0xff)));
      temp >>= BigInt(8);
    }
    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(bytes));
  }
}
