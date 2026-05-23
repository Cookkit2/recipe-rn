export const getItem = jest.fn(() => null);
export const setItem = jest.fn();
export const deleteItemAsync = jest.fn();
export const getItemAsync = jest.fn(() => Promise.resolve(null));
export const setItemAsync = jest.fn(() => Promise.resolve());
export const isAvailableAsync = jest.fn(() => Promise.resolve(true));
