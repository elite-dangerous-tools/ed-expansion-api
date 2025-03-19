
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();

async function buscarSistemasCercanos(sistema, distancia) {
    // Permitimos un 110% del valor inicial
    const distanciaInicial = parseInt(distancia);
    const distanciaPlus = (distanciaInicial * 1.1).toFixed(2);

    const query = `
        WITH origen AS (
            SELECT x, y, z FROM sistemas WHERE nombre = '${sistema}'
        ),
        distancias AS (
            SELECT s.nombre, 
                sqrt(pow(s.x - o.x, 2) + pow(s.y - o.y, 2) + pow(s.z - o.z, 2)) AS distancia
            FROM sistemas s
            JOIN origen o ON 
                s.x BETWEEN (o.x - ${distanciaPlus}) AND (o.x + ${distanciaPlus})
                AND s.y BETWEEN (o.y - ${distanciaPlus}) AND (o.y + ${distanciaPlus})
                AND s.z BETWEEN (o.z - ${distanciaPlus}) AND (o.z + ${distanciaPlus})
        )
        SELECT nombre, distancia
        FROM distancias
        WHERE distancia <= ${distanciaPlus}
        ORDER BY distancia
    `;

    const { rows } = await client.query(query);
    
    return rows;
}

exports.sistemas_alcance = async (req, res) => {
    try {
        const { distancia, sistema } = req.query;

        if (distancia > 100) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        let listaSistemas = await buscarSistemasCercanos(sistema, distancia);
        res.json(listaSistemas);

    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar sistemas al alcance" });
    }
};
