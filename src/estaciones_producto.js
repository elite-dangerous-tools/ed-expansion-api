
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();
client.setTypeParser(20, val => parseInt(val));  // Para BIGINT

async function buscarEstacionesProducto(sistemaOrigen, distancia, productos, plataforma) {
    const valores = productos.map(producto => `'${producto}'`).join(",");
    const distanciaOrigen = parseInt(distancia);

    const query = `
        SELECT
            e."name" as estacion, e."type" as tipo, e.distance as distanciaEstacion,
            pe.id_producto as producto, pe.sellprice as precio, pe.stock as suministro,
            s.nombre as sistema,
            sqrt(pow(s.x - origen.x, 2) + pow(s.y - origen.y, 2) + pow(s.z - origen.z, 2)) AS distanciaSistema
        FROM
            sistemas AS s
            JOIN estaciones AS e ON (e.systemid64 = s.systemid64)
            JOIN producto_estacion AS pe ON (pe.id_estacion = e.id),
            (SELECT systemid64, nombre, x, y, z FROM sistemas WHERE nombre = '${sistemaOrigen}') AS origen
        WHERE
            s.x BETWEEN (origen.x - ${distanciaOrigen}) AND (origen.x + ${distanciaOrigen})
        AND s.y BETWEEN (origen.y - ${distanciaOrigen}) AND (origen.y + ${distanciaOrigen})
        AND s.z BETWEEN (origen.z - ${distanciaOrigen}) AND (origen.z + ${distanciaOrigen})

        AND pe.id_producto IN (${valores})

        ORDER BY e.id
    `;

    // Ordenado por estaciones
    const { rows } = await client.query(query);
    
    return rows;
}

exports.estaciones_producto = async (req, res) => {
    try {
        const { sistema, distancia, productos, plataforma } = req.query;

        if (distancia > 150) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        const listaProductos = productos.split(",");
        let listaEstaciones = await buscarEstacionesProducto(sistema, distancia, listaProductos, plataforma);
        res.json(listaEstaciones);

    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar estaciones con el producto" });
    }
};
