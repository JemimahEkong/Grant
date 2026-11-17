const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const publicKeyVersion = 6 << 3;

function decodeBase32(input: string): Buffer | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of input) {
    const value = base32Alphabet.indexOf(character);
    if (value < 0) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

function crc16Xmodem(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

export function isStellarPublicKey(value: string): boolean {
  if (!/^G[A-Z2-7]{55}$/.test(value)) return false;
  const decoded = decodeBase32(value);
  if (!decoded || decoded.length !== 35) return false;
  if (decoded[0] !== publicKeyVersion) return false;
  const checksum = crc16Xmodem(decoded.subarray(0, 33));
  return decoded[33] === (checksum & 0xff) && decoded[34] === ((checksum >> 8) & 0xff);
}
