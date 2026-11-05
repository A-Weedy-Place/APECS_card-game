import { createHash } from "node:crypto";
import { GameError } from "@/game/errors";

export const cleanPlayerName = (name: string) => name.normalize("NFKC").trim().replace(/\s+/gu, " ");
export const playerNameKey = (name: string) => cleanPlayerName(name).toLowerCase();
export const playerNameLock = (name: string) => createHash("sha256").update(`apecs-player-name:${playerNameKey(name)}`).digest().readBigInt64BE().toString();
export type NameRecord = { id: string; original_name: string; display_name: string | null };

/** Originals remain reserved after moderation, without altering existing saved identities. */
export function assertPlayerNameAvailable(name: string, records: NameRecord[], exceptId?: string) {
  const key = playerNameKey(name);
  if (records.some(record => record.id !== exceptId && [record.original_name, record.display_name].some(value => value != null && playerNameKey(value) === key))) {
    throw new GameError("That name is already taken. Choose another name.", 409);
  }
}
