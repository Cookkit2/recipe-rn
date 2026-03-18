const fs = require('fs');

const file = 'data/db/repositories/UserChallengeRepository.ts';
let code = fs.readFileSync(file, 'utf8');

const targetFunction = `    const challengeIds = [...new Set(allUserChallenges.map((uc: any) => uc.challengeId))];

    // Batch fetch related challenges
    const challenges = await database.collections
      .get("challenge")
      .query(Q.where("id", Q.oneOf(challengeIds)))
      .fetch();`;

const replacement = `    const challengeIds = [...new Set(allUserChallenges.map((uc) => uc.challengeId))];

    // Batch fetch related challenges
    const challenges = await database.collections
      .get("challenge")
      .query(Q.where("id", Q.oneOf(challengeIds)))
      .fetch();`;

if (code.includes(targetFunction)) {
    fs.writeFileSync(file, code.replace(targetFunction, replacement));
    console.log('Successfully patched getChallengesToExpire again');
} else {
    console.log('Target function not found. Could not patch.');
}
