export function interpolate(fromList: number[], toList: number[], f: number): number[] {
  if (fromList.length !== toList.length) {
    throw new Error(`Mismatched interpolation arguments ${fromList}: ${toList}`);
  }
  return fromList.map((fromVal, i) => interpolateNum(fromVal, toList[i], f));
}

function interpolateNum(fromVal: number, toVal: number, f: number): number {
  return fromVal * (1 - f) + toVal * f;
} 