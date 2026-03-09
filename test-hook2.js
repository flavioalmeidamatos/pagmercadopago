import crypto from 'crypto';

const SECRET = '56137179e9a6e4ac2ce4b975b2e25cd8df73afa3adf8892be76361f2ea500eba';
const reqId = 'fake-req-' + Date.now();
const ts = Date.now().toString();
const dataId = '999888777';
const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
const hash = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
const signature = `t=${ts},v1=${hash}`;

console.log('Enviando...');

fetch('http://localhost:3000/api/webhooks/mercadopago', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-request-id': reqId,
        'x-signature': signature
    },
    body: JSON.stringify({ action: 'payment.created', data: { id: dataId } })
})
    .then(r => console.log('HTTP', r.status))
    .catch(e => console.log(e));
