const https = require("https");
const zlib = require("zlib");
const readline = require("readline");
const { Client } = require("pg");

const { db_config } = require("./db_config");

const estacionesUrl = "https://www.edsm.net/dump/stations.json.gz";

// Conectar a PostgreSQL
const client = new Client(db_config);
client.connect();

let batch = [];
const limiteBatch = 10000; // Inserción en lotes

// Función para escapar comillas en nombres de estaciones
function escaparComillas(nombre) {
    if (nombre) {
        return nombre.replace(/'/g, "''"); // Escapar comillas simples
    }
    return nombre;
}

// Descargar y procesar el JSON
async function descargarYProcesar(req, res) {
    console.log("Descargando archivo...");
    const request = https.get(estacionesUrl, (response) => {
        const gunzip = zlib.createGunzip();
        const rl = readline.createInterface({ input: response.pipe(gunzip) });

        console.log("Leyendo archivo...");
        rl.on("line", async (line) => {
            if (line.trim() === "[" || line.trim() === "]") return; // Ignorar corchetes

            try {
                const cleanedLine = line.replace(/,$/, ""); // Quitar coma final
                const estacion = JSON.parse(cleanedLine);

                const estacionValida = filtrarEstacion(estacion);
                if (estacionValida != null) {
                    rl.pause();

                    // batch.push([nombreEscapado, system.coords.x, system.coords.y, system.coords.z]);

                    // if (batch.length >= limiteBatch) {
                    //     rl.pause(); // Pausar lectura para evitar que siga acumulando líneas

                    //     const copiaBatch = [...batch];
                    //     batch = [];
                    //     await insertarBatch(copiaBatch);

                    //     rl.resume(); // Reanudar lectura tras insertar
                    // }
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

        rl.on("error", (err) => console.error("Error leyendo archivo:", err));
    });

    request.on("error", (err) => console.error("Error descargando archivo:", err));
}

// Insertar batch en PostgreSQL
async function insertarBatch(batch) {}

function filtrarEstacion(estacion) {
    if (estacion.haveMarket == false) {
        return null;
    }

    if (estacion.type == "Fleet Carrier") {
        return null;
    }
    if (estacion.type == null) {
        return null;
    }

    delete estacion.otherServices;
    delete estacion.controllingFaction;
    delete estacion.updateTime;
    delete estacion.outfitting;

    // Escapar el nombre de la estación
    estacion.name = escaparComillas();

    let estacionLite = {
        systemId64: estacion.systemId64,
        commodities: {
            id: 'cmmcomposite',
            name: 'CMM Composite',
            buyPrice: 0,
            stock: 0,
            sellPrice: 7782,
            demand: 48003,
            stockBracket: 0
        }
    };

    return estacion;
}

exports.descargar_estaciones = async (req, res) => {
    // Ejecutar el proceso
    await descargarYProcesar(req, res);
};
