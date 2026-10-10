const fs = require('fs');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove the inline display styles that override mobile media queries for .desktop-text
  content = content.replace(/className=\"desktop-text\" style=\{\{display:'flex',\s*alignItems:'center',\s*gap:'[0-9]+px'\}\}/g, 'className=\"desktop-text\"');
  content = content.replace(/className=\"desktop-text\" style=\{\{display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'[0-9]+px'\}\}/g, 'className=\"desktop-text\"');
  
  // Add flexWrap to the button containers
  content = content.replace(/<div className=\"flex-row gap-2\">/g, '<div className=\"flex-row gap-2\" style={{ flexWrap: \'wrap\' }}>');
  
  fs.writeFileSync(filePath, content);
  console.log('Fixed:', filePath);
}

fixFile('frontend/src/pages/MistakeBook.jsx');
