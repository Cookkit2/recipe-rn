export const randomUUID = jest.fn(() => {
  const idStr = Math.random().toString(36).substring(2, 8);
  return `${idStr}-mock-uuid-1234-1234-123456789012`;
});
export const getRandomBytes = jest.fn((length: number = 32) => {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
});
export const getRandomBytesAsync = jest.fn((length: number = 32) => {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(array);
});
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
