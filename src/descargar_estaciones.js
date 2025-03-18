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
const limiteBatch = 100; // Inserción en lotes

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
    const request = https.get(estacionesUrl, response => {
        const gunzip = zlib.createGunzip();
        const rl = readline.createInterface({ input: response.pipe(gunzip) });

        console.log("Leyendo archivo...");
        rl.on("line", async line => {
            if (line.trim() === "[" || line.trim() === "]") return; // Ignorar corchetes

            try {
                const cleanedLine = line.replace(/,$/, ""); // Quitar coma final
                const estacion = JSON.parse(cleanedLine);

                const estacionValida = filtrarEstacion(estacion);
                rl.pause();

                if (estacionValida) {
                    // Escapar el nombre de la estación
                    const nombreEscapado = escaparComillas(estacion.name);

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

        rl.on("error", err => console.error("Error leyendo archivo:", err));
    });

    request.on("error", err => console.error("Error descargando archivo:", err));
}

// Insertar batch en PostgreSQL
async function insertarBatch(batch) {
    
}

function filtrarEstacion(linea) {

    console.log(linea);
    return false;


    // if (linea[linea.length - 1] == ',') {
    //     linea = linea.substring(0, linea.length - 1);
    // }
    
    let sistema = JSON.parse(linea);
    if (sistema.haveMarket == false) {
        return null;
    }

    if (sistema.type == "Fleet Carrier") {
        return null;
    }
    if (sistema.type == null) {
        return null;
    }

    if (!tipos.includes(sistema.type)) {
        tipos.push(sistema.type);
        console.log(tipos);
    }

    delete sistema.otherServices;
    delete sistema.controllingFaction;
    delete sistema.updateTime;
    delete sistema.outfitting;

    return sistema;
}


exports.descargar_estaciones = async (req, res) => {
    // Ejecutar el proceso
    await descargarYProcesar(req, res);
};
