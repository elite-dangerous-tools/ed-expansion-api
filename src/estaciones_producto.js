
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();

async function buscarEstacionesProducto(sistemaOrigen, distancia, producto) {
    const query = `
        SELECT *
        FROM estaciones AS e,
        producto_estacion as pe
        WHERE e.systemid64 IN 
        (
            select s.systemid64
            from
                sistemas as s,
                (SELECT systemid64, nombre, x, y, z FROM sistemas WHERE nombre = '${sistemaOrigen}') as origen
            where 
                s.x BETWEEN (origen.x - ${distancia}) AND (origen.x + ${distancia}) AND
                s.y BETWEEN (origen.y - ${distancia}) AND (origen.y + ${distancia}) AND
                s.z BETWEEN (origen.z - ${distancia}) AND (origen.z + ${distancia})
        )
        and pe.id_producto = '${producto}'
        and pe.id_estacion = e.id
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
        }

        let listaEstaciones = await buscarEstacionesProducto(sistema, distancia, producto);
        res.json(listaEstaciones);

    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar estaciones con el producto" });
    }
};
