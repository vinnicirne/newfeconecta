const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  if (!fs.existsSync(dir)) return filelist;
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.next')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.tsx') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const allFiles = walkSync(path.join(__dirname, 'app'));

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Root layout backgrounds
  content = content.replace(
    /className="pb-24 max-w-2xl mx-auto flex flex-col h-full bg-gray-50 dark:bg-whatsapp-dark"/g,
    'className="pb-24 max-w-2xl mx-auto flex flex-col h-full"'
  );
  
  content = content.replace(
    /className="min-h-screen bg-black text-white pb-20 max-w-2xl mx-auto border-x border-white\/5"/g,
    'className="min-h-screen pb-20 max-w-2xl mx-auto border-x"'
  );

  content = content.replace(
    /className="min-h-screen bg-black text-white flex flex-col"/g,
    'className="min-h-screen flex flex-col"'
  );

  content = content.replace(
    /className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white"/g,
    'className="min-h-screen flex flex-col items-center justify-center gap-4"'
  );

  content = content.replace(
    /className="min-h-screen bg-black text-white pb-20 max-w-2xl mx-auto border-x border-white\/5"/g,
    'className="min-h-screen pb-20 max-w-2xl mx-auto border-x"'
  );

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  }
});
