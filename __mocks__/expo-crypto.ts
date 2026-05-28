export const randomUUID = jest.fn(() => "12345678-1234-1234-1234-123456789012");
export const getRandomBytes = jest.fn((length: number) => {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});
export const getRandomBytesAsync = jest.fn((length: number) =>
  Promise.resolve(getRandomBytes(length))
);
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
