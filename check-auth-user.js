// check-auth-user.js
const admin = require('firebase-admin');

const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function checkAuthUser(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('✅ Firebase Auth UID:', user.uid);
    console.log('🔐 Tem passwordHash?', !!user.passwordHash);
    console.log(
      '📦 ProviderData:',
      user.providerData.map((p) => p.providerId),
    );
  } catch (err) {
    console.error('❌ Firebase Auth - Usuário NÃO encontrado:', err.message);
  }
}

checkAuthUser('testefinal4@teste.com');
