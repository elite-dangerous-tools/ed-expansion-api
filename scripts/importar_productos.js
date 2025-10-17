const fs = require("fs");
const cheerio = require("cheerio");

const { Client } = require("pg");
const { db_config } = require("../src/db_config");

const client = new Client(db_config);
client.connect();
client.setTypeParser(20, val => parseInt(val)); // Para BIGINT

const ruta = "../assets/prod_";

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

    const valores = productos.join(",");
    const query = `
        INSERT INTO commodities (id, tipo)
        VALUES ${valores}
        ON CONFLICT (id) DO NOTHING
    ;`;
    await client.query(query);
}

async function traducir() {
    const ruta_en = ruta + "en.html";
    const ruta_es = ruta + "es.html";

    const prods_en = leerIdioma(ruta_en);
    const prods_es = leerIdioma(ruta_es);

    let productos = [];
    for (const key in prods_en) {
        const producto_en = prods_en[key];
        let producto_es = prods_es[key];

        if (producto_en == "Steel") {
            producto_es = "Acero";
        }

        productos.push(`('${producto_en}', '${producto_es}')`);
    }


    const valores = productos.join(",");
    const query = `UPDATE commodities
        SET nombre = f.nombre
        FROM
            ( VALUES ${valores}
            ) as f (id, nombre)
        WHERE commodities.id = f.id `;
    await client.query(query);
}

exports.importar_productos = async (req, res) => {
    await importar();
    await traducir();

    if (res) {
        res.json({ message: "ok" });
    }
    console.log("ok");
};
