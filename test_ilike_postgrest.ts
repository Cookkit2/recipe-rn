function escapeIlike(str: string): string {
  return str.replace(/[%_\\*]/g, "\\$&");
}
console.log(escapeIlike("apple*"));
