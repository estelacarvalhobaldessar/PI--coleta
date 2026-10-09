import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Um único .env na raiz do projeto, o mesmo lido pela api e pelo website (PHP).
export const ENV_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env')

dotenv.config({ path: ENV_FILE })
