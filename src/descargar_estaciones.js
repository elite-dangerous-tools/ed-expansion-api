const https = require("https");
const zlib = require("zlib");
const readline = require("readline");
const { Client } = require("pg");

const { db_config } = require("./db_config");

const estacionesUrl = "https://www.edsm.net/dump/stations.json.gz";

// Conectar a PostgreSQL
const client = new Client(db_config);
client.connect();

let productos = [];
let productosSinGuardar = [];
let estaciones = [];
let productosEstaciones = [];

const limiteBatch = 1000; // Inserción en lotes

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
                if (estacionValida == true) {
                    rl.pause();

                    if (productosSinGuardar.length > 0) {
                        await insertarProductos();
                        productosSinGuardar = [];
                    }
                    
                    if (estaciones.length > limiteBatch) {
                        await insertarBatch();
                    }
                    
                    rl.resume();
                }
            } catch (err) {
                console.error("Error con lectura y guardado:", err);
                rl.close();
            }
        });

        rl.on("close", async () => {
            // Insertar el último batch si no está vacío
            if (estaciones.length > 0) await insertarBatch();
            console.log("Proceso completado.");
            client.end();
            res.json({ message: "Proceso completado" });
        });

        rl.on("error", (err) => console.error("Error leyendo archivo:", err));
    });

    request.on("error", (err) => console.error("Error descargando archivo:", err));
}

// Insertar batch en PostgreSQL
async function insertarBatch() {
    const valoresEstaciones = estaciones.map(est => 
        `(${est.id}, '${est.name}', ${est.distanceToArrival}, '${est.type}', ${est.systemId64})`
    ).join(",");
    
    const queryEstaciones = `
        INSERT INTO estaciones (id, name, distance, type, systemId64)
        SELECT * FROM (VALUES ${valoresEstaciones}) AS temp(id, name, distance, type, systemId64)
        WHERE EXISTS (
            SELECT 1 FROM sistemas WHERE sistemas.systemid64 = temp.systemId64
        )
        ON CONFLICT DO NOTHING;
    `;

    try {
        await client.query(queryEstaciones);
    } catch (err) {
        console.error("Error insertando batch:", err);
    }
    estaciones = [];
    
    
    const valoresProductosEstaciones = productosEstaciones.map(pe => `('${pe.id_producto}', ${pe.id_estacion}, ${pe.stock}, ${pe.sellPrice})`).join(",");
    const queryProductosEstaciones = `
        INSERT INTO producto_estacion (id_producto, id_estacion, stock, sellPrice)
        SELECT * FROM (VALUES ${valoresProductosEstaciones}) AS temp(id_producto, id_estacion, stock, sellPrice)
        WHERE EXISTS (
            SELECT 1 FROM estaciones WHERE estaciones.id = temp.id_estacion
        )
        ON CONFLICT DO NOTHING;
    `;

    try {
        await client.query(queryProductosEstaciones);
    } catch (err) {
        console.error("Error insertando batch:", err);
    }
    productosEstaciones = [];
}


async function insertarProductos() {
    const valores = productosSinGuardar.map(prod => `('${prod.id}', '${prod.name}')`).join(",");
    
    const query = `
        INSERT INTO productos(id, name)
        VALUES ${valores}
        ON CONFLICT (id) DO NOTHING;
    `;

    try {
        await client.query(query);
    } catch (err) {
        console.error("Error insertando batch:", err);
    }
}

function filtrarEstacion(estacion) {
    if (estacion.haveMarket == false) {
        return false;
    }
    if (estacion.type == "Fleet Carrier") {
        return false;
    }
    if (estacion.type == null) {
        return false;
    }
    if (!estacion.commodities || estacion.commodities.length <= 0) {
        return false;
    }

    // Escapar el nombre de la estación
    const nombreEstacion = escaparComillas(estacion.name);

    const datosEstacion = {
        id: estacion.id,
        name: nombreEstacion,
        type: estacion.type,
        distanceToArrival: estacion.distanceToArrival,
        systemId64: estacion.systemId64
    };

    estacion.commodities.forEach(producto => {
        let existe = productos.findIndex(fila => fila.id == producto.id) >= 0;
        if (!existe) {
            let datosProducto = {
                id: producto.id,
                name: escaparComillas(producto.name)
            };
            productos.push(datosProducto);
            productosSinGuardar.push(datosProducto);
        }

        if (producto.stock > 0) {
            productosEstaciones.push({
                id_producto: producto.id,
                id_estacion: estacion.id,
                stock: producto.stock,
                sellPrice: producto.sellPrice,
            });
        }
    });

    estaciones.push(datosEstacion);

    return true;
}

exports.descargar_estaciones = async (req, res) => {

    const query = `SELECT id from productos `;
    const { rows } = await client.query(query);
    productos = [...rows];

    // Ejecutar el proceso
    await descargarYProcesar(req, res);
};
