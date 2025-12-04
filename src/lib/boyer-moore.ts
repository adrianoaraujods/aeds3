/**
 * Boyer-Moore Pattern Searching Algorithm
 * - This implementation finds all occurrences of a pattern within a text using
 * both the Bad Character and Good Suffix heuristics.
 */
export class BoyerMoore {
  private readonly badCharTable: number[] = [];
  private readonly goodSuffixTable: number[] = [];

  constructor(private readonly pattern: string) {
    this.badCharTable = this.preprocessBadCharacter(pattern);
    this.goodSuffixTable = this.preprocessGoodSuffix(pattern);
  }

  public search(text: string): number[] {
    const n = text.length;
    const m = this.pattern.length;
    const occurrences: number[] = [];

    if (m === 0) return [];
    if (m > n) return [];

    let s = 0;

    while (s <= n - m) {
      let j = m - 1;

      while (j >= 0 && this.pattern[j] === text[s + j]) j--;

      if (j < 0) {
        occurrences.push(s);

        s += this.goodSuffixTable[0];
      } else {
        const charCode = text.charCodeAt(s + j);

        const badCharShift = Math.max(1, j - this.badCharTable[charCode]);
        const goodSuffixShift = this.goodSuffixTable[j + 1];

        s += Math.max(badCharShift, goodSuffixShift);
      }
    }

    return occurrences;
  }

  /**
   * Creates a table indicating the last occurrence of each character in the pattern.
   */
  private preprocessBadCharacter(pattern: string): number[] {
    const m = pattern.length;
    const badCharTable = new Array(256).fill(-1); // ASCII

    for (let i = 0; i < m; i++) {
      badCharTable[pattern.charCodeAt(i)] = i;
    }

    return badCharTable;
  }

  /**
   * Creates a table of shift amounts based on the suffix match.
   */
  private preprocessGoodSuffix(pattern: string): number[] {
    const m = pattern.length;

    const goodSuffixTable = new Array(m + 1).fill(0);
    const borderPos = new Array(m + 1).fill(0); // Auxiliary array for border positions

    let i = m;
    let j = m + 1;
    borderPos[i] = j;

    // Case 1: The matching suffix occurs elsewhere in the pattern
    while (i > 0) {
      while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
        if (goodSuffixTable[j] === 0) {
          goodSuffixTable[j] = j - i;
        }
        j = borderPos[j];
      }
      i--;
      j--;
      borderPos[i] = j;
    }

    // Case 2: Only a prefix of the pattern matches the suffix of the mismatch
    j = borderPos[0];
    for (let k = 0; k <= m; k++) {
      if (goodSuffixTable[k] === 0) {
        goodSuffixTable[k] = j;
      }
      if (k === j) {
        j = borderPos[j];
      }
    }

    return goodSuffixTable;
  }
}
