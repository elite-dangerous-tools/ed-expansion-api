
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();

async function buscarEstacionesProducto(sistemaOrigen, distancia, productos) {
    const valores = productos.map(producto => `'${producto}'`).join(",");

    // Permitimos un 110% del valor inicial
    const distanciaInicial = parseInt(distancia);
    const distanciaPlus = (distanciaInicial * 1.1).toFixed(2);

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
            s.x BETWEEN (origen.x - ${distanciaPlus}) AND (origen.x + ${distanciaPlus})
        AND s.y BETWEEN (origen.y - ${distanciaPlus}) AND (origen.y + ${distanciaPlus})
        AND s.z BETWEEN (origen.z - ${distanciaPlus}) AND (origen.z + ${distanciaPlus})

        AND pe.id_producto IN (${valores})
        ORDER BY pe.id_estacion
    `;

    const { rows } = await client.query(query);
    
    return rows;
}

exports.estaciones_producto = async (req, res) => {
    try {
        const { sistema, distancia, producto } = req.query;

        if (distancia > 100) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        let productos = [];
        if (Array.isArray(producto)) {
            productos = [...producto]
        } else {
            productos.push(producto);
        }

        let listaEstaciones = await buscarEstacionesProducto(sistema, distancia, productos);
        res.json(listaEstaciones);

    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar estaciones con el producto" });
    }
};
