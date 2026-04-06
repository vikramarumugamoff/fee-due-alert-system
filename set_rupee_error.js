const fs=require('fs');
const path='frontend/src/pages/student/PaymentPortal.jsx';
let lines=fs.readFileSync(path,'utf8').split(/\r?\n/);
lines[58]='      setError(`Amount cannot exceed pending fee of \u20B9${feeData.unpaidAmount.toLocaleString()}`);';
fs.writeFileSync(path, lines.join('\n'));
