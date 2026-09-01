import re

with open(".env.example", "r") as f:
    content = f.read()

pattern = r"""# Security - MMKV Encryption \(required for encrypted auth storage\)
EXPO_PUBLIC_MMKV_ENCRYPTION_KEY=your_32_char_or_more_encryption_key

"""

new_content = re.sub(pattern, "", content)

with open(".env.example", "w") as f:
    f.write(new_content)
