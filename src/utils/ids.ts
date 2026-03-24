let counter = 0;

export function generateId(): string {
  counter++;
  return `${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
