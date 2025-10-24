import { default as makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  const phoneNumber = req.query.phone
  if (!phoneNumber) {
    return res.status(400).send('Use ?phone=234XXXXXXXXXX')
  }

  try {
    const authDir = path.join('/tmp', 'auth')
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

    const { state, saveCreds } = await useMultiFileAuthState(authDir)
    const sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      auth: state,
      printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    if (!sock.authState.creds.registered) {
      const pairingCode = await sock.requestPairingCode(phoneNumber)
      await saveCreds()

      res.status(200).json({
        pairingCode,
        message: 'Enter this pairing code in WhatsApp > Linked Devices > Link with phone number',
        downloadUrl: `https://${req.headers.host}/api/download`
      })
    } else {
      res.status(200).json({ message: 'Already paired. Visit /api/download to get your creds.' })
    }
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`)
  }
  }
