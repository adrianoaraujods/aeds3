/**
 * Boyer-Moore Pattern Searching Algorithm
 * - This implementation finds all occurrences of a pattern within a text using
 * both the Bad Character and Good Suffix heuristics.
 */
export class BoyerMoore {
  public static search(text: string, pattern: string): number[] {
    const n = text.length;
    const m = pattern.length;
    const occurrences: number[] = [];

    if (m === 0) return [];
    if (m > n) return [];

    // Precompute tables
    const badCharTable = this.preprocessBadCharacter(pattern);
    const goodSuffixTable = this.preprocessGoodSuffix(pattern);

    let s = 0; // s is the shift of the pattern with respect to text

    while (s <= n - m) {
      let j = m - 1;

      // Keep reducing j while characters of pattern and text are matching
      // at this shift s
      while (j >= 0 && pattern[j] === text[s + j]) {
        j--;
      }

      if (j < 0) {
        // Case: A match is found
        occurrences.push(s);

        // Shift pattern so that the next character in text aligns with the last
        // occurrence of it in pattern. If we are at the end, use good suffix [0].
        // Note: We cannot use Bad Character here effectively because there is no mismatch char.
        s += goodSuffixTable[0];
      } else {
        // Case: Mismatch at index j
        // We take the MAXIMUM of the two heuristics

        const charCode = text.charCodeAt(s + j);

        // Calculate Bad Character Shift
        // We want to align text[s+j] with its last occurrence in pattern.
        // Math.max(1, ...) handles the case where the character appears AFTER index j
        const badCharShift = Math.max(1, j - badCharTable[charCode]);

        // Calculate Good Suffix Shift
        // goodSuffixTable[j+1] contains the shift if mismatch occurred at j
        const goodSuffixShift = goodSuffixTable[j + 1];

        s += Math.max(badCharShift, goodSuffixShift);
      }
    }

    return occurrences;
  }

  /**
   * Creates a table indicating the last occurrence of each character in the pattern.
   */
  private static preprocessBadCharacter(pattern: string): number[] {
    const m = pattern.length;
    const badCharTable = new Array(256).fill(-1); // ASCII

    for (let i = 0; i < m; i++) {
      // We store the index of the character.
      // If the character repeats, the last index overwrites previous ones.
      badCharTable[pattern.charCodeAt(i)] = i;
    }

    return badCharTable;
  }

  /**
   * Creates a table of shift amounts based on the suffix match.
   */
  private static preprocessGoodSuffix(pattern: string): number[] {
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
