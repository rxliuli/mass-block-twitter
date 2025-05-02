export class Cubic {
  private curves: number[];

  constructor(curves: number[]) {
    this.curves = curves;
  }

  public getValue(time: number): number {
    let startGradient = 0;
    let endGradient = 0;
    let start = 0;
    let mid = 0;
    const end = 1;

    if (time <= 0) {
      if (this.curves[0] > 0) {
        startGradient = this.curves[1] / this.curves[0];
      } else if (this.curves[1] === 0 && this.curves[2] > 0) {
        startGradient = this.curves[3] / this.curves[2];
      }
      return startGradient * time;
    }

    if (time >= 1) {
      if (this.curves[2] < 1) {
        endGradient = (this.curves[3] - 1) / (this.curves[2] - 1);
      } else if (this.curves[2] === 1 && this.curves[0] < 1) {
        endGradient = (this.curves[1] - 1) / (this.curves[0] - 1);
      }
      return 1 + endGradient * (time - 1);
    }

    let currentStart = start;
    let currentEnd = end;
    while (currentStart < currentEnd) {
      mid = (currentStart + currentEnd) / 2;
      const xEst = this.calculate(this.curves[0], this.curves[2], mid);
      if (Math.abs(time - xEst) < 0.00001) {
        return this.calculate(this.curves[1], this.curves[3], mid);
      }
      if (xEst < time) {
        currentStart = mid;
      } else {
        currentEnd = mid;
      }
    }
    return this.calculate(this.curves[1], this.curves[3], mid);
  }

  private calculate(a: number, b: number, m: number): number {
    return 3 * a * (1 - m) * (1 - m) * m + 3 * b * (1 - m) * m * m + m * m * m;
  }
} 