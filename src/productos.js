
const { Client } = require("pg");
const { db_config } = require("./db_config");

let client = null;

async function getClient() {
    if (!client) {
        client = new Client(db_config);
        client.setTypeParser(20, val => parseInt(val));
        await client.connect();
    }
    return client;
}

async function buscarProductos() {
    const db = await getClient();
    const query = `
        SELECT id, COALESCE(nombre, id) AS nombre, tipo
        FROM commodities
    `;

    const { rows } = await db.query(query);
    
    return rows;
}

exports.productos = async (req, res) => {
    try {
        let listaProductos = await buscarProductos();
        res.json(listaProductos);

    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar productos" });
    }
};
