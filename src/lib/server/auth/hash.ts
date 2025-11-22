import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

export async function hash(password: string) {
  return await argonHash(password);
}

export async function verify(hash: string, password: string) {
  return await argonVerify(hash, password);
}
