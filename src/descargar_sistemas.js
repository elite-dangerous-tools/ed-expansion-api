const fs = require("fs");
const https = require("https");
const zlib = require("zlib");
const readline = require("readline");
const { Client } = require("pg");

const limiteAlcance = 1000;
const sistemasUrl = "https://www.edsm.net/dump/systemsWithCoordinates.json.gz";

const dbConfig = {
    user: "postgres",
    host: "stormseekers.twilightparadox.com",
    database: "elite",
    password: "8UtsF1FuIskBRt9TTfnM2",
    port: 5432
};

// Conectar a PostgreSQL
const client = new Client(dbConfig);
client.connect();

let batch = [];
const limiteBatch = 100; // Inserción en lotes

// Función para escapar comillas en nombres de sistemas
function escaparComillas(nombre) {
    if (nombre) {
        return nombre.replace(/'/g, "''"); // Escapar comillas simples
    }
    return nombre;
}

// Descargar y procesar el JSON
async function descargarYProcesar(req, res) {
    console.log("Descargando archivo...");
    const request = https.get(sistemasUrl, response => {
        const gunzip = zlib.createGunzip();
        const rl = readline.createInterface({ input: response.pipe(gunzip) });

        console.log("Leyendo archivo...");
        rl.on("line", async line => {
            if (line.trim() === "[" || line.trim() === "]") return; // Ignorar corchetes

            try {
                const cleanedLine = line.replace(/,$/, ""); // Quitar coma final
                const system = JSON.parse(cleanedLine);

                const sistemaAlAlcance = comprobarSistema(system);
                if (sistemaAlAlcance) {
                    // Escapar el nombre del sistema
                    const nombreEscapado = escaparComillas(system.name);

                    batch.push([nombreEscapado, system.coords.x, system.coords.y, system.coords.z]);

                    if (batch.length >= limiteBatch) {
                        rl.pause(); // Pausar lectura para evitar que siga acumulando líneas

                        const copiaBatch = [...batch];
                        batch = [];
                        await insertarBatch(copiaBatch);

                        rl.resume(); // Reanudar lectura tras insertar
                    }
                }
            } catch (err) {
                console.error("Error con lectura y guardado:", err);
                rl.close();
            }
        });

        rl.on("close", async () => {
            // Insertar el último batch si no está vacío
            if (batch.length > 0) await insertarBatch(batch);
            console.log("Proceso completado.");
            client.end();
            res.json({ message: "Proceso completado" });
        });

        rl.on("error", err => console.error("Error leyendo archivo:", err));
    });

    request.on("error", err => console.error("Error descargando archivo:", err));
}

// Insertar batch en PostgreSQL
async function insertarBatch(batch) {
    const valores = batch.map(system => `('${system[0]}', ${system[1]}, ${system[2]}, ${system[3]})`).join(",");

    const query = `
        INSERT INTO SISTEMAS(nombre, x, y, z)
        VALUES ${valores}
        ON CONFLICT (nombre) DO NOTHING;
    `;

    try {
        await client.query(query);
    } catch (err) {
        console.error("Error insertando batch:", err);
    }
}

function comprobarSistema(sistema) {
    if (sistema.coords == null || sistema.coords == undefined) {
        return false;
    }

    if (
        sistema.coords.x == null ||
        sistema.coords.x == undefined ||
        sistema.coords.y == null ||
        sistema.coords.y == undefined ||
        sistema.coords.z == null ||
        sistema.coords.z == undefined
    ) {
        return false;
    }

    if (Math.abs(sistema.coords.x) > limiteAlcance) {
        return false;
    }
    if (Math.abs(sistema.coords.y) > limiteAlcance) {
        return false;
    }
    if (Math.abs(sistema.coords.z) > limiteAlcance) {
        return false;
    }

    return true;
}

exports.descargar_sistemas = async (req, res) => {
    // Ejecutar el proceso
    await descargarYProcesar(req, res);
};
