import bcrypt from 'bcrypt';
import { randomBytes, scrypt } from 'node:crypto';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('hashes passwords with Argon2id', async () => {
    const hash = await service.hashPassword('UnaClaveSegura123!');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(service.needsRehash(hash)).toBe(false);
  });

  it('verifies only the matching password', async () => {
    const hash = await service.hashPassword('UnaClaveSegura123!');

    await expect(
      service.verifyPassword(hash, 'UnaClaveSegura123!'),
    ).resolves.toBe(true);
    await expect(
      service.verifyPassword(hash, 'OtraClaveSegura123!'),
    ).resolves.toBe(false);
  });

  it('generates a different salted hash for the same password', async () => {
    const firstHash = await service.hashPassword('UnaClaveSegura123!');
    const secondHash = await service.hashPassword('UnaClaveSegura123!');

    expect(firstHash).not.toBe(secondHash);
  });

  it('returns false for a corrupt hash and requests its replacement', async () => {
    await expect(
      service.verifyPassword('corrupt-hash', 'UnaClaveSegura123!'),
    ).resolves.toBe(false);
    expect(service.needsRehash('corrupt-hash')).toBe(true);
  });

  it('verifies legacy bcrypt hashes so they can be rehashed after login', async () => {
    const plainPassword = 'UnaClaveSegura123!';
    const legacyHash = await bcrypt.hash(plainPassword, 4);

    await expect(
      service.verifyPassword(legacyHash, plainPassword),
    ).resolves.toBe(true);
    expect(service.needsRehash(legacyHash)).toBe(true);
  });

  it('verifies existing scrypt hashes so they can be rehashed after login', async () => {
    const plainPassword = 'UnaClaveSegura123!';
    const salt = randomBytes(16);
    const derivedKey = await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        plainPassword,
        salt,
        64,
        {
          cost: 32768,
          blockSize: 8,
          parallelization: 1,
          maxmem: 64 * 1024 * 1024,
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
    const legacyHash = [
      'scrypt',
      32768,
      8,
      1,
      salt.toString('base64'),
      derivedKey.toString('base64'),
    ].join('$');

    await expect(
      service.verifyPassword(legacyHash, plainPassword),
    ).resolves.toBe(true);
    expect(service.needsRehash(legacyHash)).toBe(true);
  });

  it('performs a dummy verification when no stored hash is available', async () => {
    await expect(
      service.verifyOrDummy('UnaClaveSegura123!'),
    ).resolves.toBe(false);
  });
});
