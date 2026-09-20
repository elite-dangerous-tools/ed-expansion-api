const fs = require("fs");
const path = require("path");

const mysql = require("mysql2/promise");
const { db_config } = require("../src/db_config");

let connection = null;

async function getConnection() {
    if (!connection) {
        connection = await mysql.createConnection({
            host: db_config.host,
            user: db_config.user,
            password: db_config.password,
            database: db_config.database,
            port: db_config.port
        });
    }
    return connection;
}

// Limpia caracteres invisibles (variation selectors, PUA de inara, zero-width)
function limpiar(s) {
    return s.replace(/[\uE000-\uF8FF\uFE0E\uFE0F\u200B-\u200D\u2060]/g, "").trim();
}

function escaparComillas(nombre) {
    return nombre ? nombre.replace(/'/g, "''") : nombre;
}

async function descargar(tipo) {
    let response = await fetch("https://spansh.co.uk/api/stations/field_values/" + tipo);
    let respuesta = await response.json();
    return respuesta.values.name;
}

async function importar() {
    let productos = [];

    for (const tipo of ["import_commodities", "export_commodities", "prohibited_commodities"]) {
        let lista = await descargar(tipo);
        let tipoSimple = tipo.replace("_commodities", "");
        lista.forEach(prod => {
            productos.push(`('${escaparComillas(limpiar(prod))}', '${tipoSimple}')`);
        });
    }

    const db = await getConnection();
    const query = `INSERT IGNORE INTO commodities (id, tipo) VALUES ${productos.join(",")}`;
    await db.query(query);
    console.log("Importados", productos.length, "commodities de spansh");
}

function cargarTraducciones() {
    const ruta = path.join(__dirname, "traducciones.json");
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
}

async function traducir() {
    const traducciones = cargarTraducciones();

    const db = await getConnection();

    // Actualizar nombre de commodities existentes
    let actualizadas = 0;
    for (const [nombreEn, nombreEs] of Object.entries(traducciones)) {
        const [result] = await db.query(
            "UPDATE commodities SET nombre = ? WHERE LOWER(id) = LOWER(?) AND (nombre IS NULL OR nombre = '')",
            [nombreEs, nombreEn]
        );
        if (result.affectedRows > 0) actualizadas++;
    }
    console.log("Traducidas", actualizadas, "commodities");

    // Insertar commodities raros que no están en spansh (solo tienen traducción)
    const [existentes] = await db.query("SELECT id FROM commodities");
    const existentesSet = new Set(existentes.map(r => r.id.toLowerCase()));

    // Insertar commodities que están en traducciones.json pero NO en spansh
    // (import+export+prohibited). Son commodities raros u otros que inara lista
    // pero spansh no incluye en sus listas de field_values.
    const raros = Object.entries(traducciones)
        .filter(([k]) => !existentesSet.has(k.toLowerCase()));

    if (raros.length > 0) {
        const valores = raros.map(([k, v]) => `('${escaparComillas(k)}', '${escaparComillas(v)}', 'rare')`).join(",");
        await db.query(`INSERT INTO commodities (id, nombre, tipo) VALUES ${valores} ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), tipo = 'rare'`);
        console.log("Insertados", raros.length, "commodities raros");
    }
}

exports.importar_productos = async (req, res) => {
    await importar();
    await traducir();

    if (res) {
        res.json({ message: "ok" });
    }
    console.log("ok");
};

// Ejecución directa: node scripts/importar_productos.js
if (require.main === module) {
    exports.importar_productos()
        .then(() => process.exit(0))
        .catch(e => { console.error(e); process.exit(1); });
}
