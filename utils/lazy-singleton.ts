/** Construct a service on first use, preserving method receivers. */
export function lazySingleton<T extends object>(create: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, key) {
      instance ??= create();
      const value = Reflect.get(instance, key);
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}
