export const randomUUID = jest.fn(() => {
  const idStr = Math.random().toString(36).substring(2);
  return `${idStr}-mock-uuid-1234-56789012`;
});
export const getRandomBytes = jest.fn((length = 32) => {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
});
export const getRandomBytesAsync = jest.fn((length = 32) => {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(arr);
});
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
