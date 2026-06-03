export const randomUUID = jest.fn(() => "12345678-1234-1234-1234-123456789012");
export const getRandomBytes = jest.fn((byteCount: number) => {
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
});
export const getRandomBytesAsync = jest.fn((byteCount: number) =>
  Promise.resolve(getRandomBytes(byteCount))
);
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
