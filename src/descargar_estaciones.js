const https = require("https");
const zlib = require("zlib");
const readline = require("readline");
const { Client } = require("pg");
const fs = require('fs');

const { db_config } = require("./db_config");

const estacionesUrl = "https://www.edsm.net/dump/stations.json.gz";

// Conectar a PostgreSQL
const client = new Client(db_config);
client.connect();

contadorEstaciones = 0;
let productos = [];
let productosSinGuardar = [];
let estaciones = [];
let productosEstaciones = [];

// Inserción en lotes
const limiteBatch = 5000;

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

                    if ((estaciones.length + productosEstaciones.length) > limiteBatch) {
                        await insertarBatchEstaciones();
                        await insertarBatchStock();
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
            if (estaciones.length > 0) {
                await insertarBatchEstaciones();
            }
            if (productosEstaciones.length > 0) {
                await insertarBatchStock();
            }
            
            // Al terminar, actualizamos la vista de productos
            await client.query("REFRESH MATERIALIZED VIEW vista_productos;");
            client.end();

            
            const mensaje = "Proceso de descargar estaciones y precios completado";
            console.log(mensaje);
            if (res) {
                res.json({ message: mensaje });
            }
        });

        rl.on("error", (err) => console.error("Error leyendo archivo:", err));
    });

    request.on("error", (err) => console.error("Error descargando archivo:", err));
}

async function insertarBatchEstaciones() {
    const valoresEstaciones = estaciones.map((est) => `(${est.id}, '${est.name}', ${est.distanceToArrival}, '${est.type}', ${est.systemId64})`).join(",");

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
        console.error("Error sql insertar estaciones:", err);
    }
    estaciones = [];
}

async function insertarBatchStock(lista = productosEstaciones, vieneDeError=false) {
    // Hay filas duplicadas que tenemos que descartar
    let mapaProductosEstaciones = Array.from(new Map(lista.map((pe) => [`${pe.id_producto}-${pe.id_estacion}`, pe])).values());

    const valoresProductosEstaciones = mapaProductosEstaciones.map((pe) => 
        `('${pe.id_producto}', ${pe.id_estacion}, ${pe.stock}, ${pe.sellPrice}, ${pe.demand}, ${pe.buyPrice})`
    ).join(",");
    const queryProductosEstaciones = `
        INSERT INTO producto_estacion (id_producto, id_estacion, stock, sellPrice, demand, buyPrice)
        SELECT * FROM (VALUES ${valoresProductosEstaciones}) AS temp(id_producto, id_estacion, stock, sellPrice, demand, buyPrice)
        WHERE EXISTS (
            SELECT 1 FROM estaciones WHERE estaciones.id = temp.id_estacion
        )
        ON CONFLICT (id_producto, id_estacion) DO UPDATE
        SET
        stock = EXCLUDED.stock,
        sellPrice = EXCLUDED.sellPrice,

        demand = EXCLUDED.demand,
        buyPrice = EXCLUDED.buyPrice
    ;`;

    productosEstaciones = [];
    
    try {
        await client.query(queryProductosEstaciones);
    } catch (err) {
        
        if (vieneDeError) {
            console.error("Error sql insertar productosEstaciones:", err);
            guardarError(lista, queryProductosEstaciones);
        } else {
            for (const key in lista) {
                const fila = lista[key];
                await insertarBatchStock([fila], true);
            }
        }

    }
}

function guardarError(productoEstacion, queryProductosEstaciones) {
    const estacion = productoEstacion[0];
    
    let ruta = "./assets/";
    if (!fs.existsSync(ruta)) {
        ruta = "../assets/";
    }

    try {
        fs.writeFileSync('./assets/' + estacion.name + '.sql', queryProductosEstaciones);
        fs.writeFileSync('./assets/' + estacion.name + '.json', JSON.stringify(productoEstacion));
    } catch (error) {}
}

async function insertarProductos() {
    const valores = productosSinGuardar.map((prod) => `('${prod.id}', '${prod.name}')`).join(",");

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
    // Escapar el nombre de la estación
    const nombreEstacion = escaparComillas(estacion.name);

    if (nombreEstacion.includes("Orbital Construction Site") || nombreEstacion.includes("System Colonisation Ship")) {
        // Es un sistema reclamado, guardamos la estación para que detectemos el sistema como ocupado y no libre
    } else if (estacion.type == "Fleet Carrier") {
        // No guardamos los carriers
        return false;
    } else if (!estacion.systemId64) {
        // No tiene sistema, no podemos guardarlo
        return false;
    }

    if (estacion.type == null || estacion.type == undefined) {
        estacion.type == "-";
    }

    const datosEstacion = {
        id: estacion.id,
        name: nombreEstacion,
        type: estacion.type,
        distanceToArrival: estacion.distanceToArrival,
        systemId64: estacion.systemId64,
    };


    if (estacion.commodities && estacion.commodities.length > 0) {
        
        estacion.commodities.forEach((producto) => {
            let existe = productos.findIndex((fila) => fila.id == producto.id) >= 0;
            if (!existe) {
                let datosProducto = {
                    id: producto.id,
                    name: escaparComillas(producto.name),
                };
                productos.push(datosProducto);
                productosSinGuardar.push(datosProducto);
            }

            if (producto.stock > 0 || producto.demand > 0) {
                productosEstaciones.push({
                    id_producto: producto.id,
                    id_estacion: estacion.id,

                    stock: producto.stock,
                    sellPrice: producto.sellPrice,

                    demand: producto.demand,
                    buyPrice: producto.buyPrice,
                });

            }
        });

    }

    estaciones.push(datosEstacion);

    contadorEstaciones++;
    if (contadorEstaciones % 1000 === 0) {
        console.log(contadorEstaciones, nombreEstacion);
    }

    return true;
}

exports.descargar_estaciones = async (req, res, cron=false) => {
    const query = `SELECT id from productos `;
    const { rows } = await client.query(query);
    productos = [...rows];
    console.log("Recuperamos los productos:", productos.length);

    // Limpiamos datos antiguos
    if (cron) {
        await client.query(`
            TRUNCATE TABLE producto_estacion, estaciones
        `);
        console.log("Borramos estaciones y productos");
    }

    // Ejecutar el proceso
    await descargarYProcesar(req, res);
};
