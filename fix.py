import re

with open("data/services/HouseholdSyncService.ts", "r") as f:
    content = f.read()

content = content.replace("const allItems = await stockCollection.query().fetch();", 'const allItems = await stockCollection.query(Q.where("household_id", householdSupabaseId)).fetch();')

with open("data/services/HouseholdSyncService.ts", "w") as f:
    f.write(content)
