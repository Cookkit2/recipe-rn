import { Q } from "@nozbe/watermelondb";
console.log(
  Q.or(Q.where("expiry_date", Q.notEq(null)), Q.where("expiry_date", Q.lt(new Date().getTime())))
);
