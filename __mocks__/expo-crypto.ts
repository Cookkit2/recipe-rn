export const randomUUID = jest.fn(() => "12345678-1234-1234-1234-123456789012");
export const getRandomBytes = jest.fn((length: number = 32) => {
  const array = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  return array;
});
export const getRandomBytesAsync = jest.fn(() => Promise.resolve(new Uint8Array(32)));
export const digestStringAsync = jest.fn(() => Promise.resolve("mocked-digest"));
