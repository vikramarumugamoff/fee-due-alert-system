const fs=require('fs');
const path='frontend/src/pages/student/PaymentPortal.jsx';
let lines=fs.readFileSync(path,'utf8').split(/\r?\n/);
lines.splice(186,5);
fs.writeFileSync(path, lines.join('\n'));
