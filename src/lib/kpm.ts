export class KPM {
  private readonly lps: number[];

  constructor(private readonly term: string) {
    this.lps = Array.from({ length: this.term.length }, () => 0);

    let length = 0;
    let i = 1;

    this.lps[0] = 0;

    while (i < this.term.length) {
      if (this.term[i] === this.term[length]) {
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

  public match(text: string): number[] {
    const matches: number[] = [];

    let i = 0;
    let j = 0;

    while (i < text.length) {
      if (text[i] === this.term[j]) {
        i++;
        j++;

        if (j == this.term.length) {
          matches.push(i - j);
          j = this.lps[j - 1];
        }
      } else if (j > 0) {
        j = this.lps[j - 1];
      } else {
        i++;
      }
    }

    return matches;
  }
}
