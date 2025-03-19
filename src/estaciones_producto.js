
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();

async function buscarEstacionesProducto(sistemaOrigen, distancia, productos) {
    const valores = productos.map(producto => `'${producto}'`).join(",");

    // Permitimos un 110% del valor inicial
    const distanciaInicial = parseInt(distancia);
    const distanciaPlus = distanciaInicial * 1.1;

    const query = `
        SELECT e."name", e.distance, e."type", pe.id_producto, pe.id_estacion, pe.stock, pe.sellprice
        FROM estaciones AS e,
        producto_estacion as pe
        WHERE e.systemid64 IN 
        (
            select s.systemid64
            from
                sistemas as s,
                (SELECT systemid64, nombre, x, y, z FROM sistemas WHERE nombre = '${sistemaOrigen}') as origen
            where 
                s.x BETWEEN (origen.x - ${distanciaPlus}) AND (origen.x + ${distanciaPlus}) AND
                s.y BETWEEN (origen.y - ${distanciaPlus}) AND (origen.y + ${distanciaPlus}) AND
                s.z BETWEEN (origen.z - ${distanciaPlus}) AND (origen.z + ${distanciaPlus})
        )
        and pe.id_producto in (${valores})
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
