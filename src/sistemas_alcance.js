
const { Client } = require("pg");
const { db_config } = require("./db_config");

const client = new Client(db_config);
client.connect();

async function buscarSistemasCercanos(x, y, z, distancia) {
    const query = `
        SELECT nombre, x, y, z
        FROM (
            select nombre, x, y, z,
            sqrt(pow(x - '${x}', 2) + pow(y - '${y}', 2) + pow(z - '${z}', 2)) AS distancia
            from sistemas
        ) as tabla
        WHERE distancia < ${distancia}
        ORDER BY distancia
    `;

    const { rows } = await client.query(query);
    
    return rows;
}

exports.sistemas_alcance = async (req, res) => {
    try {
        const { distancia, sistema } = req.query;
        const query = `SELECT nombre, x, y, z FROM sistemas WHERE nombre = '${sistema}' `;

        const { rows } = await client.query(query);
        
        if (rows.length == 1) {
            const s = rows[0];
            let listaSistemas = await buscarSistemasCercanos(s.x, s.y, s.z, distancia);
            res.json(listaSistemas);
        } else {
            res.json({message: "Nada para el sistema " + sistema});
        }

        // buscarSistemasCercanos();

        // res.json(sistemasAlcance);
    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar sistemas al alcance" });
    }
};
