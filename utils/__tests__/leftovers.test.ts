import { defaultLeftoverReminder, validateLeftover } from "../leftovers";
const now = new Date(2026, 11, 31, 23);
it("defaults to tomorrow 6 pm in local time across years", () => {
  const reminder = defaultLeftoverReminder(now);
  expect([
    reminder.getFullYear(),
    reminder.getMonth(),
    reminder.getDate(),
    reminder.getHours(),
  ]).toEqual([2027, 0, 1, 18]);
});
it("accepts a manual entry with no reminder", () => {
  expect(() => validateLeftover({ name: "Soup", servings: 1, cookedAt: now }, now)).not.toThrow();
});
it.each([
  { name: "", servings: 1, cookedAt: now },
  { name: "Soup", servings: 0, cookedAt: now },
  { name: "Soup", servings: NaN, cookedAt: now },
  { name: "Soup", servings: 1, cookedAt: new Date(NaN) },
  { name: "Soup", servings: 1, cookedAt: defaultLeftoverReminder(now) },
  { name: "Soup", servings: 1, cookedAt: now, remindAt: now },
])("rejects an invalid leftover input", (input) => {
  expect(() => validateLeftover(input, now)).toThrow();
});
