
const mysql = require("mysql2/promise");
const { db_config } = require("./db_config");

let pool = null;

async function getPool() {
    if (!pool) {
        pool = mysql.createPool({
            host: db_config.host,
            user: db_config.user,
            password: db_config.password,
            database: db_config.database,
            port: db_config.port,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        });
    }
    return pool;
}

async function buscarProductos() {
    const db = await getPool();
    const query = `
        SELECT id, COALESCE(nombre, id) AS nombre, tipo
        FROM commodities
    `;

    const [rows] = await db.query(query);
    
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
