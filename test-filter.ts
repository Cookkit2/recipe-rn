import { Q } from "@nozbe/watermelondb";
console.log(Q.or(Q.where("a", Q.eq(null)), Q.where("b", Q.eq(1))));
