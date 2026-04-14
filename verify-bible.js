const fs = require('fs');

const versions = ['nvi', 'aa', 'acf'];
let allComplete = true;

for (const ver of versions) {
  let raw = fs.readFileSync(`./apps/admin/public/bible/${ver}.json`, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  }

  const data = JSON.parse(raw);
  
  let emptyCount = 0;
  let shortCount = 0;
  let totalVerses = 0;

  data.forEach(book => {
    book.chapters.forEach((chapter, chapterIndex) => {
      chapter.forEach((verse, verseIndex) => {
        totalVerses++;
        if (!verse || typeof verse !== 'string' || verse.trim() === '') {
          emptyCount++;
          console.log(`[${ver}] Vazio: ${book.name} ${chapterIndex + 1}:${verseIndex + 1}`);
        } else if (verse.length <= 2) { // Algumas letras não podem ser um versiculo
          shortCount++;
          console.log(`[${ver}] Muito Curto: ${book.name} ${chapterIndex + 1}:${verseIndex + 1} - "${verse}"`);
        }
      });
    });
  });

  console.log(`--- Versão ${ver.toUpperCase()} ---`);
  console.log(`Versículos testados: ${totalVerses}`);
  console.log(`Versículos Vazios ou Inválidos: ${emptyCount}`);
  console.log(`Versículos Anormalmente Curtos: ${shortCount}`);
  
  if (emptyCount > 0 || shortCount > 0) allComplete = false;
}

if(allComplete) {
  console.log('TODAS AS VERSÕES ESTÃO 100% COMPLETAS, SEM TEXTOS VAZIOS!');
}
