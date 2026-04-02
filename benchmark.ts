const NUM_ITERATIONS = 1000000;
const data = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8,
  i: 9,
  j: 10,
  k: undefined,
  l: 12,
  m: undefined,
};

function oldWay() {
  const r: any = {};
  Object.keys(data).forEach((key) => {
    if (data[key as keyof typeof data] !== undefined) {
      r[key] = data[key as keyof typeof data];
    }
  });
  return r;
}

function newWay() {
  const r: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      if (data[key as keyof typeof data] !== undefined) {
        r[key] = data[key as keyof typeof data];
      }
    }
  }
  return r;
}

// Warmup
for (let i = 0; i < 1000; i++) {
  oldWay();
  newWay();
}

const startOld = performance.now();
for (let i = 0; i < NUM_ITERATIONS; i++) {
  oldWay();
}
const endOld = performance.now();

const startNew = performance.now();
for (let i = 0; i < NUM_ITERATIONS; i++) {
  newWay();
}
const endNew = performance.now();

console.log(`Old way: ${endOld - startOld}ms`);
console.log(`New way: ${endNew - startNew}ms`);
console.log(
  `Improvement: ${(((endOld - startOld - (endNew - startNew)) / (endOld - startOld)) * 100).toFixed(2)}%`
);
