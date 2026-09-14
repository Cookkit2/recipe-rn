const parseTextRegex = (input) => {
  const segments = [];
  const regex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, match.index),
        isBold: false,
      });
    }

    segments.push({
      text: match[1] || "",
      isBold: true,
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({
      text: input.slice(lastIndex),
      isBold: false,
    });
  }

  return segments;
};

const parseTextIndexOf = (input) => {
  const segments = [];
  let lastIndex = 0;

  while (true) {
    const startIndex = input.indexOf("**", lastIndex);
    if (startIndex === -1) {
      break;
    }

    const endIndex = input.indexOf("**", startIndex + 2);
    if (endIndex === -1) {
      break;
    }

    if (startIndex > lastIndex) {
      segments.push({
        text: input.slice(lastIndex, startIndex),
        isBold: false,
      });
    }

    segments.push({
      text: input.slice(startIndex + 2, endIndex),
      isBold: true,
    });

    lastIndex = endIndex + 2;
  }

  if (lastIndex < input.length) {
    segments.push({
      text: input.slice(lastIndex),
      isBold: false,
    });
  }

  return segments;
};

const tests = [
  "Hello **world**!",
  "**bold** normal",
  "normal **bold**",
  "normal **bold",
  "**a****b**",
  "**a***b**",
  "**a**b**c**",
  "****",
  "******",
];

let allMatch = true;
for (const t of tests) {
  const r1 = JSON.stringify(parseTextRegex(t));
  const r2 = JSON.stringify(parseTextIndexOf(t));
  if (r1 !== r2) {
    console.log(`Mismatch for: ${t}`);
    console.log(`Regex:   ${r1}`);
    console.log(`IndexOf: ${r2}`);
    allMatch = false;
  }
}

if (allMatch) {
  console.log("All tests passed! Behaviors are identical.");
}
