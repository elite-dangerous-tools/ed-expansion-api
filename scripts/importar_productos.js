const fs = require("fs");
const cheerio = require("cheerio");

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

// Función para escapar comillas en nombres de estaciones
function escaparComillas(nombre) {
    if (nombre) {
        return nombre.replace(/'/g, "''"); // Escapar comillas simples
    }
    return nombre;
}

function leerIdioma(fichero) {
    const htmlContent = fs.readFileSync(fichero, "utf8");
    const $ = cheerio.load(htmlContent);

    let productos = {};

    const tableRows = $("table tr a");
    tableRows.each((index, element) => {
        const row = $(element);

        const valor = row.text().trim();
        const enlace = row.attr("href");

        const datos = enlace.split("/");
        const id = parseInt(datos[3]);

        productos[id] = valor;
    });

    return productos;
}

async function descargar(tipo) {
    let response = await fetch("https://spansh.co.uk/api/stations/field_values/" + tipo, {
        method: "GET",
        mode: "no-cors"
    });

    let respuesta = await response.json();

    return respuesta.values.name;
}

async function importar() {
    let productos = [];

    let prods_importar = await descargar("import_commodities");
    prods_importar.forEach(prod => {
        const nombreIngles = escaparComillas(prod);
        productos.push(`('${nombreIngles}', 'import')`);
    });

    let prods_prohibidos = await descargar("prohibited_commodities");
    prods_prohibidos.forEach(prod => {
        const nombreIngles = escaparComillas(prod);
        productos.push(`('${nombreIngles}', 'prohibited')`);
    });

    let prods_exportar = await descargar("export_commodities");
    prods_exportar.forEach(prod => {
        const nombreIngles = escaparComillas(prod);
        productos.push(`('${nombreIngles}', 'export')`);
    });

    const db = await getConnection();
    const valores = productos.join(",");
    const query = `
        INSERT IGNORE INTO commodities (id, tipo)
        VALUES ${valores}
    ;`;
    await db.query(query);
}

async function traducir(ruta, mercancia_rara=false) {
    const ruta_en = ruta + "en.html";
    const ruta_es = ruta + "es.html";

    const prods_en = leerIdioma(ruta_en);
    const prods_es = leerIdioma(ruta_es);

    let productos = [];
    for (const key in prods_en) {
        const producto_en = escaparComillas(prods_en[key]);
        let producto_es = escaparComillas(prods_es[key]);

        if (producto_en == "Steel") {
            producto_es = "Acero";
        }

        productos.push(`('${producto_en}', '${producto_es}')`);
    }

    let setExtra = "";
    if (mercancia_rara) {
        setExtra = ", tipo = 'rare'";
    }

    const subqueries = productos.map(v => {
        const match = v.match(/^\('(.+?)',\s*'(.+?)'\)$/);
        return `SELECT '${match[1]}' AS id, '${match[2]}' AS nombre`;
    });

    const db = await getConnection();
    const query = `UPDATE commodities
        JOIN (
            ${subqueries.join("\n            UNION ALL\n            ")}
        ) AS f ON LOWER(commodities.id) = LOWER(f.id)
        SET commodities.nombre = f.nombre${setExtra}`;
    await db.query(query);
}

exports.importar_productos = async (req, res) => {
    await importar();
    
    await traducir("../assets/prod_");
    await traducir("../assets/rare_", true);

    if (res) {
        res.json({ message: "ok" });
    }
    console.log("ok");
};
