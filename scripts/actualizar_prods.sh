
# Ejecutamos desde la raíz del proyecto para que dotenv encuentre el .env
cd "$(dirname "$0")/.."
node scripts/importar_productos.js
