export const randomUUID = jest.fn(() => "12345678-1234-1234-1234-123456789012");
export const getRandomBytes = jest.fn((length: number = 32) => {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
});

export const getRandomBytesAsync = jest.fn((length: number = 32) => {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(bytes);
});
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
