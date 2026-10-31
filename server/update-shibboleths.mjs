import mysql from 'mysql2/promise'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

const caPath = path.resolve(__dirname, process.env.DB_SSL_CA || 'certs/isrgrootx1.pem')
const caContent = fs.readFileSync(caPath)

async function updateShibboleths() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || process.env['anim-db-pswd'] || '',
      database: process.env.DB_NAME,
      ssl: {
        ca: caContent,
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      }
    })

    const updateQuery = `
      UPDATE animator SET shibboleth = CASE animator_ID
        WHEN 1001 THEN 'nemda' -- Németh Dániel
        WHEN 883  THEN 'bolpe' -- Bolla Péter
        WHEN 963  THEN 'szepe' -- Széwald Péter Tamás
        WHEN 745  THEN 'kovan' -- Kovács Anna
        WHEN 812  THEN 'nagbe' -- Nagy Bence
        WHEN 904  THEN 'totzs' -- Tóth Zsófia
        WHEN 670  THEN 'balma' -- Balogh Márton
        WHEN 720  THEN 'hores' -- Horváth Eszter
        WHEN 915  THEN 'kisis' -- Kiss István
        WHEN 928  THEN 'varma' -- Varga Máté
        WHEN 1010 THEN 'szavi' -- Szabó Vivien Barbara
        WHEN 1011 THEN 'kelki' -- Kellermann Kinga
        WHEN 1012 THEN 'meski' -- Mészáros Kinga
        WHEN 1013 THEN 'szajo' -- Szabó József
        WHEN 1014 THEN 'trema' -- Trencsik Markó
        WHEN 1015 THEN 'aszbo' -- Aszódi Boglárka
        ELSE shibboleth
      END;
    `

    console.log('Executing UPDATE statement on TiDB Cloud...')
    const [result] = await connection.query(updateQuery)
    console.log(`Updated ${result.affectedRows} rows.`)

    const [rows] = await connection.query(`
      SELECT animator_ID, nev, shibboleth FROM animator ORDER BY nev ASC
    `)
    console.table(rows)

    await connection.end()
  } catch (err) {
    console.error('Error updating shibboleths:', err)
  }
}

updateShibboleths()

