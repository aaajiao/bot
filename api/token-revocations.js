'use strict'

const nativeFs = require('fs')
const path = require('path')
const crypto = require('crypto')
const childProcess = require('child_process')

function unavailable() {
  const error = new Error('Authentication state is temporarily unavailable.')
  error.code = 'AUTH_STATE_UNAVAILABLE'
  return error
}

function tokenDigest(req) {
  const header = req.headers && req.headers.authorization
  const match = typeof header === 'string' && /^Bearer ([^\s]+)$/i.exec(header)
  if (!match) throw unavailable()
  return crypto.createHash('sha256').update(match[1]).digest('hex')
}

function createStore(options) {
  options = options || {}
  const fs = options.fileSystem || nativeFs
  const directory = options.directory || '/app/maintenance-state'
  const filename = path.join(directory, 'token-revocations.json')
  const lockname = path.join(directory, 'token-revocations.lock')
  const maximumEntries = options.maximumEntries || 10000
  const maximumBytes = options.maximumBytes || 2 * 1024 * 1024
  const now = options.now || (() => Math.floor(Date.now() / 1000))
  const notify = options.onMaintenanceError || (() => {})
  const flags = fs.constants
  let timer

  function checkMount() {
    if (!options.requireMount) return
    const mounted = fs.readFileSync('/proc/self/mountinfo', 'utf8').split('\n').some(line => {
      const field = line.split(' ')[4]
      return field && field.replace(/\\([0-7]{3})/g, (all, octal) =>
        String.fromCharCode(parseInt(octal, 8))) === directory
    })
    if (!mounted) throw unavailable()
  }

  function checkDirectory() {
    checkMount()
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
    const stat = fs.lstatSync(directory)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw unavailable()
  }

  function readState() {
    let fd
    try {
      checkMount()
      fd = fs.openSync(filename, flags.O_RDONLY | flags.O_NOFOLLOW)
      const stat = fs.fstatSync(fd)
      if (!stat.isFile() || (stat.mode & 0o077) || stat.size > maximumBytes) throw unavailable()
      const state = JSON.parse(fs.readFileSync(fd, 'utf8'))
      if (!state || state.version !== 1 || !Array.isArray(state.entries) ||
          Object.keys(state).sort().join(',') !== 'entries,version' ||
          state.entries.length > maximumEntries) throw unavailable()
      const seen = new Set()
      for (const entry of state.entries) {
        if (!entry || Object.keys(entry).sort().join(',') !== 'digest,exp' ||
            !/^[a-f0-9]{64}$/.test(entry.digest) || !Number.isSafeInteger(entry.exp) || entry.exp <= 0 ||
            seen.has(entry.digest)) throw unavailable()
        seen.add(entry.digest)
      }
      return state.entries
    } finally {
      if (fd !== undefined) fs.closeSync(fd)
    }
  }

  function cleanTemporaryFiles() {
    for (const name of fs.readdirSync(directory)) {
      if (!/^token-revocations\.json\.\d+\.[a-f0-9]{16}\.tmp$/.test(name)) continue
      const file = path.join(directory, name)
      if (fs.lstatSync(file).isFile()) fs.unlinkSync(file)
    }
  }

  function withLock(fn) {
    let fd
    try {
      checkDirectory()
      fd = fs.openSync(lockname, flags.O_RDWR | flags.O_CREAT | flags.O_NOFOLLOW, 0o600)
      if (!fs.fstatSync(fd).isFile()) throw unavailable()
      fs.fchmodSync(fd, 0o600)
      // flock locks the inherited open-file description. The parent descriptor
      // keeps the kernel lock after the helper exits; closing it releases it.
      const lock = childProcess.spawnSync('/usr/bin/flock', ['-x', '3'], {
        stdio: ['ignore', 'ignore', 'pipe', fd], timeout: 1500
      })
      if (lock.error || lock.status !== 0) throw unavailable()
      cleanTemporaryFiles()
      return fn()
    } finally {
      if (fd !== undefined) fs.closeSync(fd)
    }
  }

  function writeState(entries) {
    if (entries.length > maximumEntries) throw unavailable()
    const serialized = JSON.stringify({ version: 1, entries }) + '\n'
    if (Buffer.byteLength(serialized) > maximumBytes) throw unavailable()
    const temporary = filename + '.' + process.pid + '.' + crypto.randomBytes(8).toString('hex') + '.tmp'
    let fd
    let dirfd
    try {
      fd = fs.openSync(temporary, flags.O_WRONLY | flags.O_CREAT | flags.O_EXCL | flags.O_NOFOLLOW, 0o600)
      fs.writeFileSync(fd, serialized, 'utf8')
      fs.fsyncSync(fd)
      fs.closeSync(fd)
      fd = undefined
      fs.renameSync(temporary, filename)
      dirfd = fs.openSync(directory, flags.O_RDONLY | flags.O_DIRECTORY | flags.O_NOFOLLOW)
      fs.fsyncSync(dirfd)
    } finally {
      if (fd !== undefined) fs.closeSync(fd)
      if (dirfd !== undefined) fs.closeSync(dirfd)
      try { fs.unlinkSync(temporary) } catch (error) { if (error.code !== 'ENOENT') throw error }
    }
  }

  function cleanupExpired() {
    try {
      const existing = readState()
      if (!existing.some(entry => entry.exp <= now())) return false
      return withLock(() => {
        const entries = readState()
        const active = entries.filter(entry => entry.exp > now())
        if (active.length === entries.length) return false
        writeState(active)
        return true
      })
    } catch (error) { throw unavailable() }
  }

  function initialize() {
    checkDirectory()
    try { readState() } catch (error) {
      if (error.code !== 'ENOENT') throw error
      withLock(() => {
        try { readState() } catch (missing) {
          if (missing.code !== 'ENOENT') throw missing
          writeState([])
        }
      })
    }
  }

  // Initialization errors do not prevent public artwork routes from starting.
  // Protected reads fail closed until durable state is readable again.
  try { initialize() } catch (error) { notify() }
  try { cleanupExpired() } catch (error) { notify() }
  if (options.cleanupIntervalMs !== 0) {
    timer = setInterval(() => {
      try { cleanupExpired() } catch (error) { notify() }
    }, options.cleanupIntervalMs || 15 * 60 * 1000)
    timer.unref()
  }

  return {
    assertReadable() {
      try { readState(); return true } catch (error) { throw unavailable() }
    },
    isRevoked(digest) {
      try {
        if (!/^[a-f0-9]{64}$/.test(digest)) throw unavailable()
        return readState().some(entry => entry.digest === digest && entry.exp > now())
      } catch (error) { throw unavailable() }
    },
    revoke(digest, exp) {
      try {
        if (!/^[a-f0-9]{64}$/.test(digest) || !Number.isSafeInteger(exp)) throw unavailable()
        return withLock(() => {
          const entries = readState().filter(entry => entry.exp > now())
          if (exp > now() && !entries.some(entry => entry.digest === digest)) {
            // Never evict a still-valid revocation to make room.
            if (entries.length >= maximumEntries) throw unavailable()
            entries.push({ digest, exp })
          }
          writeState(entries)
          return true
        })
      } catch (error) { throw unavailable() }
    },
    cleanupExpired,
    close() { if (timer) clearInterval(timer) }
  }
}

module.exports = { createStore, tokenDigest, unavailable }
