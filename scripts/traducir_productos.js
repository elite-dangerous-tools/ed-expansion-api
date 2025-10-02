const fs = require("fs");
const cheerio = require("cheerio");

const { Client } = require("pg");
const { db_config } = require("../src/db_config");

const client = new Client(db_config);
client.connect();
client.setTypeParser(20, val => parseInt(val)); // Para BIGINT

const ruta = "../assets/prod_";

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

async function traducir() {
    const ruta_en = ruta + "en.html";
    const ruta_es = ruta + "es.html";

    const prods_en = leerIdioma(ruta_en);
    const prods_es = leerIdioma(ruta_es);

    for (const key in prods_en) {
        const producto_en = prods_en[key];
        const producto_es = prods_es[key];

        const prod_en_lowercase = producto_en.toLowerCase();
        const query = `UPDATE productos SET nombre = '${producto_es}' WHERE lower(name) like '${prod_en_lowercase}' and nombre is null `;
        await client.query(query);
        
        console.log(producto_en, "->", producto_es);
    }
}

traducir();
