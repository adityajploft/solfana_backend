import firebaseAdmin from "firebase-admin";
import path from 'path';

const serviceAccount = path.resolve('storage/firebase-credentials.json');

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

export default firebaseAdmin;
