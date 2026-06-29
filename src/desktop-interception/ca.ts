import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import forge from 'node-forge';
import { checkPrivateKeyStorage, isRflectrOwnedDesktopPath } from './trust.js';

export interface DesktopCaPaths {
  readonly installId: string;
  readonly baseDir: string;
  readonly certPath: string;
  readonly keyPath: string;
}

export interface DesktopCaCreateResult extends DesktopCaPaths {
  readonly created: boolean;
  readonly keyStorageOk: boolean;
}

export function resolveDesktopCaPaths(baseDir: string, installId: string): DesktopCaPaths {
  if (!installId.startsWith('rflectr-')) {
    throw new Error('desktop CA install id must be rflectr-owned');
  }
  const installDir = resolve(baseDir, installId);
  return {
    installId,
    baseDir: installDir,
    certPath: join(installDir, 'ca-cert.pem'),
    keyPath: join(installDir, 'ca-key.pem'),
  };
}

export function createDesktopCa(options: {
  readonly baseDir: string;
  readonly installId: string;
  readonly commonName?: string;
  readonly windowsAclValidated?: boolean;
}): DesktopCaCreateResult {
  const paths = resolveDesktopCaPaths(options.baseDir, options.installId);
  if (!isRflectrOwnedDesktopPath(paths.keyPath, options.installId)) {
    throw new Error('desktop CA path is not rflectr-owned');
  }

  mkdirSync(paths.baseDir, { recursive: true, mode: 0o700 });
  const existed = existsSync(paths.certPath) && existsSync(paths.keyPath);
  if (!existed) {
    const pair = generateCaPair(options.commonName ?? `rflectr desktop ${options.installId}`);
    writeFileSync(paths.keyPath, pair.keyPem, { mode: 0o600, flag: 'wx' });
    writeFileSync(paths.certPath, pair.certPem, { mode: 0o644, flag: 'wx' });
  }

  const keyCheck = checkPrivateKeyStorage(paths.keyPath, options.windowsAclValidated === true);
  if (!keyCheck.ok) {
    throw new Error(`desktop CA key storage rejected: ${keyCheck.reason ?? 'unknown_reason'}`);
  }

  return { ...paths, created: !existed, keyStorageOk: true };
}

export function removeOwnedDesktopCa(paths: DesktopCaPaths): boolean {
  if (!isRflectrOwnedDesktopPath(paths.keyPath, paths.installId) || !isRflectrOwnedDesktopPath(paths.certPath, paths.installId)) {
    return false;
  }
  const keyDir = resolve(dirname(paths.keyPath));
  const certDir = resolve(dirname(paths.certPath));
  if (keyDir !== certDir || keyDir !== resolve(paths.baseDir)) {
    return false;
  }
  rmSync(keyDir, { recursive: true, force: true });
  return true;
}

export function loadDesktopCaPublicStatus(paths: DesktopCaPaths) {
  return {
    installId: paths.installId,
    caPresent: existsSync(paths.certPath),
    keyPresent: existsSync(paths.keyPath),
    certPreview: existsSync(paths.certPath) ? readFileSync(paths.certPath, 'utf8').slice(0, 64) : undefined,
    privateKeyMaterial: undefined,
  };
}

export function canValidateWindowsAcl(): boolean {
  return platform() !== 'win32';
}

function generateCaPair(commonName: string): { certPem: string; keyPem: string } {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = Date.now().toString(16);
  cert.validity.notBefore = new Date(Date.now() - 60_000);
  cert.validity.notAfter = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const attrs = [{ name: 'commonName', value: commonName }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, cRLSign: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
  };
}
