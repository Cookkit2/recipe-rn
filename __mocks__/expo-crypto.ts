export const randomUUID = jest.fn(() => {
  const mockId = Math.floor(Math.random() * 1000000000).toString();
  return `${mockId}-mock-uuid`;
});
export const getRandomBytes = jest.fn((length: number) => {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
});
export const getRandomBytesAsync = jest.fn((length: number) => {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(bytes);
});
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
