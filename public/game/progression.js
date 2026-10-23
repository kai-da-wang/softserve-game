export const SKINS=Object.freeze([
 {id:'vanilla',score:0,name:{zh:'原味香草',en:'Vanilla',ja:'バニラ',ko:'바닐라'},color:'#fff6df',palette:['#bfb49c','#ddd2b9','#fff4dc','#e9dfc7']},
 {id:'strawberry',score:50,name:{zh:'草莓奶霜',en:'Strawberry',ja:'いちごミルク',ko:'딸기 크림'},color:'#f4b6c5',palette:['#bb7e92','#dfa0b1','#ffe0e9','#efb7c9']},
 {id:'matcha',score:100,name:{zh:'宇治抹茶',en:'Matcha',ja:'宇治抹茶',ko:'말차'},color:'#b9ce92',palette:['#7e925c','#a6bc7b','#e0edbf','#c4d89a']},
 {id:'cocoa',score:200,name:{zh:'浓醇可可',en:'Cocoa',ja:'濃厚ココア',ko:'진한 코코아'},color:'#a57253',palette:['#603d2d','#906146','#d9af86','#b5825e']},
 {id:'taro',score:350,name:{zh:'绵云芋泥',en:'Taro cloud',ja:'タロクラウド',ko:'타로 구름'},color:'#c5b5df',palette:['#8b7aab','#b4a0cc','#eee1ff','#d0bce7']},
 {id:'aurora',score:500,name:{zh:'极光双旋',en:'Aurora twist',ja:'オーロラツイスト',ko:'오로라 트위스트'},color:'#badfd0',secondColor:'#f3c4d9',palette:['#83b5a0','#b5d8c3','#edfff0','#d0e9d5'],secondPalette:['#bd91b1','#e3bbd6','#fff0fc','#f3cde5']}
]);
export const skinById=id=>SKINS.find(s=>s.id===id)||SKINS[0];
export const isUnlocked=(id,score)=>skinById(id).id===id&&score>=skinById(id).score;
export const unlockedSkins=score=>SKINS.filter(s=>score>=s.score);
export const nextUnlock=score=>SKINS.find(s=>s.score>score)||null;
export const heightToScore=cm=>Math.max(0,Math.round(cm*10));
export const dayKey=ms=>new Date(ms+8*60*60*1000).toISOString().slice(0,10);
