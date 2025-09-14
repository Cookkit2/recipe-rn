export default class AppHelper {
  static delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
}
