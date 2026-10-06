// Simple client-side WebAuthn wrapper for convenience local login

// Generates a random Uint8Array
const generateRandomBuffer = (length: number) => {
  const arr = new Uint8Array(length);
  window.crypto.getRandomValues(arr);
  return arr;
};

// Base64Url encoding/decoding helper
const bufferToBase64url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  const base64String = btoa(str);
  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64urlToBuffer = (base64url: string) => {
  const padding = '='.repeat((4 - base64url.length % 4) % 4);
  const base64 = (base64url + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
};

export const isBiometricsSupported = () => {
  return window.PublicKeyCredential !== undefined;
};

export const hasBiometricsRegistered = (userId: string) => {
  return localStorage.getItem(`kabel_biometric_${userId}`) !== null;
};

export const registerBiometrics = async (userId: string, userName: string): Promise<boolean> => {
  if (!isBiometricsSupported()) return false;
  try {
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: generateRandomBuffer(32),
      rp: {
        name: "Kabel Docházka",
        id: window.location.hostname
      },
      user: {
        id: generateRandomBuffer(16),
        name: userName,
        displayName: userName
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      },
      timeout: 60000,
      attestation: "none"
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
    if (credential) {
      localStorage.setItem(`kabel_biometric_${userId}`, bufferToBase64url(credential.rawId));
      return true;
    }
    return false;
  } catch (err) {
    console.error("Biometrics registration failed", err);
    return false;
  }
};

export const authenticateBiometrics = async (userId: string): Promise<boolean> => {
  if (!isBiometricsSupported()) return false;
  const credentialIdStr = localStorage.getItem(`kabel_biometric_${userId}`);
  if (!credentialIdStr) return false;

  try {
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: generateRandomBuffer(32),
      allowCredentials: [{
        type: "public-key",
        id: base64urlToBuffer(credentialIdStr)
      }],
      userVerification: "required",
      timeout: 60000
    };

    const assertion = await navigator.credentials.get({ publicKey }) as PublicKeyCredential;
    if (assertion) {
      return true;
    }
    return false;
  } catch (err) {
    console.error("Biometrics authentication failed", err);
    return false;
  }
};
