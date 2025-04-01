
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();
client.setTypeParser(20, val => parseInt(val));  // Para BIGINT

async function buscarDistanciaTrailblazer(sistema) {
    const query = `
            SELECT
                s.nombre AS sistema,
	            e.name AS estacion,
                e.distance AS distanciaEstacion,
                sqrt(pow(s.x - origen.x, 2) + pow(s.y - origen.y, 2) + pow(s.z - origen.z, 2)) AS distanciaSistema
            FROM
                sistemas AS s
	            JOIN estaciones AS e ON (s.systemid64 = e.systemid64),
                (SELECT systemid64, nombre, x, y, z FROM sistemas WHERE nombre = '${sistema}') AS origen
            WHERE e.name like 'Trailblazer%'
            ORDER BY distanciaSistema
    `;

    const { rows } = await client.query(query);
    
    return rows;
}

exports.distancia_trailblazer = async (req, res) => {
    try {
        const { sistema } = req.query;

        let listaTrailblazers = await buscarDistanciaTrailblazer(sistema);
        res.json(listaTrailblazers);

    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar Trailblazers" });
    }
};
