import { customAlphabet } from "nanoid";

// Unambiguous alphabet: no 0/O, 1/I/L confusion.
const nanoid = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

export function generateAccessCode() {
  return nanoid();
}
