export class KPM {
  private readonly lps: number[];

  constructor(private readonly pattern: string) {
    this.lps = Array.from({ length: this.pattern.length }, () => 0);

    let length = 0;
    let i = 1;

    this.lps[0] = 0;

    while (i < this.pattern.length) {
      if (this.pattern[i] === this.pattern[length]) {
        length++;
        this.lps[i] = length;
        i++;
      } else {
        if (length !== 0) {
          length = this.lps[length - 1];
        } else {
          this.lps[i] = 0;
          i++;
        }
      }
    }
  }

  public search(text: string): number[] {
    const occurrences: number[] = [];

    let i = 0;
    let j = 0;

    while (i < text.length) {
      if (text[i] === this.pattern[j]) {
        i++;
        j++;

        if (j == this.pattern.length) {
          occurrences.push(i - j);
          j = this.lps[j - 1];
        }
      } else if (j > 0) {
        j = this.lps[j - 1];
      } else {
        i++;
      }
    }

    return occurrences;
  }
}
