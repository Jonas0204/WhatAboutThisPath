import { createHash } from 'node:crypto'

const password = process.argv[2]

if (!password) {
  console.error('Usage: node scripts/hashPassword.mjs <password>')
  process.exit(1)
}

const hash = createHash('sha256').update(password).digest('hex')
console.log(hash)
