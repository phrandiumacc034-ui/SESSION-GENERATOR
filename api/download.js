import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  const filePath = path.join('/tmp', 'auth', 'creds.json')

  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="mac_creds.json"')
    res.setHeader('Content-Type', 'application/json')
    const data = fs.readFileSync(filePath)
    res.send(data)
  } else {
    res.status(404).send('No creds.json found. Generate one first.')
  }
}
