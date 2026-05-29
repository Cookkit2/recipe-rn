export const randomUUID = jest.fn(() => "12345678-1234-1234-1234-123456789012");
export const getRandomBytes = jest.fn(
  (size: number = 32) =>
    new Uint8Array(Array.from({ length: size }, () => Math.floor(Math.random() * 256)))
);
export const getRandomBytesAsync = jest.fn((size: number = 32) =>
  Promise.resolve(
    new Uint8Array(Array.from({ length: size }, () => Math.floor(Math.random() * 256)))
  )
);
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
