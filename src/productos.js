
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();
client.setTypeParser(20, val => parseInt(val));  // Para BIGINT

async function buscarProductos() {
    const query = `
        SELECT id, COALESCE(nombre, id) AS nombre, tipo
        FROM commodities
    `;

    const { rows } = await client.query(query);
    
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
