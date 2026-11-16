import { Injectable } from '@nestjs/common';
import {
  argon2id,
  hash as argon2Hash,
  needsRehash as argon2NeedsRehash,
  verify as argon2Verify,
  type HashOptions,
} from 'argon2';
import bcrypt from 'bcrypt';
import { scrypt, timingSafeEqual } from 'node:crypto';

const ARGON2_OPTIONS: HashOptions = {
  type: argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const LEGACY_SCRYPT_KEY_LENGTH = 64;
const LEGACY_SCRYPT_COST = 32768;
const LEGACY_SCRYPT_BLOCK_SIZE = 8;
const LEGACY_SCRYPT_PARALLELIZATION = 1;
const LEGACY_SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const DUMMY_PASSWORD = 'password-en-desuso-para-verificacion';

@Injectable()
export class PasswordService {
  private dummyHash?: Promise<string>;

  async hashPassword(plainPassword: string): Promise<string> {
    try {
      return await argon2Hash(plainPassword, ARGON2_OPTIONS);
    } catch (error) {
      throw new Error('No se pudo hashear la contraseña.', { cause: error });
    }
  }

  async verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    if (hash.startsWith('$argon2id$')) {
      try {
        return await argon2Verify(hash, plainPassword);
      } catch {
        return false;
      }
    }

    if (/^\$2[aby]\$/.test(hash)) {
      try {
        return await bcrypt.compare(plainPassword, hash);
      } catch {
        return false;
      }
    }

    return this.verifyLegacyScrypt(hash, plainPassword);
  }

  needsRehash(hash: string): boolean {
    if (!hash.startsWith('$argon2id$')) {
      return true;
    }

    try {
      return argon2NeedsRehash(hash, ARGON2_OPTIONS);
    } catch {
      return true;
    }
  }

  async verifyOrDummy(
    plainPassword: string,
    hash?: string,
  ): Promise<boolean> {
    if (hash) {
      return this.verifyPassword(hash, plainPassword);
    }

    this.dummyHash ??= argon2Hash(DUMMY_PASSWORD, ARGON2_OPTIONS);
    await this.verifyPassword(await this.dummyHash, plainPassword);
    return false;
  }

  private async verifyLegacyScrypt(
    hash: string,
    plainPassword: string,
  ): Promise<boolean> {
    const parts = hash.split('$');
    if (
      parts.length !== 6 ||
      parts[0] !== 'scrypt' ||
      Number(parts[1]) !== LEGACY_SCRYPT_COST ||
      Number(parts[2]) !== LEGACY_SCRYPT_BLOCK_SIZE ||
      Number(parts[3]) !== LEGACY_SCRYPT_PARALLELIZATION
    ) {
      return false;
    }

    const salt = Buffer.from(parts[4], 'base64');
    const expectedKey = Buffer.from(parts[5], 'base64');
    if (
      salt.length !== 16 ||
      expectedKey.length !== LEGACY_SCRYPT_KEY_LENGTH
    ) {
      return false;
    }

    try {
      const derivedKey = await new Promise<Buffer>((resolve, reject) => {
        scrypt(
          plainPassword,
          salt,
          LEGACY_SCRYPT_KEY_LENGTH,
          {
            cost: LEGACY_SCRYPT_COST,
            blockSize: LEGACY_SCRYPT_BLOCK_SIZE,
            parallelization: LEGACY_SCRYPT_PARALLELIZATION,
            maxmem: LEGACY_SCRYPT_MAX_MEMORY,
          },
          (error, key) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(key);
          },
        );
      });
      return timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }
}
