export function convertRotationToMatrix(rotation: number): number[] {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos, -sin, sin, cos];
} 