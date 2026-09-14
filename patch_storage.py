import re

with open("data/storage/storage-config.ts", "r") as f:
    content = f.read()

# Pattern to find and remove the fallback code block
pattern = r"""\s*// 2\. Fallback: EXPO_PUBLIC_\* key inlined from \.env at build time\..*?if \(Constants\.expoConfig\?\.extra\?\.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY\) \{\s*return Constants\.expoConfig\.extra\.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY;\s*\}"""

new_content = re.sub(pattern, "", content, flags=re.DOTALL)

with open("data/storage/storage-config.ts", "w") as f:
    f.write(new_content)
