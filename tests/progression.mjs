import assert from 'node:assert/strict';
import {SKINS,isUnlocked,nextUnlock,unlockedSkins,heightToScore,dayKey} from '../public/game/progression.js';

assert.equal(heightToScore(7.612),76);
assert.equal(heightToScore(-1),0);
for(const skin of SKINS){
  assert(isUnlocked(skin.id,skin.score));
  if(skin.score)assert(!isUnlocked(skin.id,skin.score-1));
}
assert(!isUnlocked('invented-skin',10000));
assert.deepEqual(unlockedSkins(76).map(s=>s.id),['vanilla','strawberry']);
assert.equal(nextUnlock(76).id,'matcha');
assert.equal(nextUnlock(500),null);
assert.equal(dayKey(Date.parse('2026-10-23T15:59:59.999Z')),'2026-10-23');
assert.equal(dayKey(Date.parse('2026-10-23T16:00:00.000Z')),'2026-10-24');
console.log('Exact unlock boundaries, unknown skins, score conversion, and Beijing midnight reset passed.');
