const https = require("https");
const zlib = require("zlib");
const fs = require("fs");
const readline = require("readline");

exports.descargar = async (req, res, fileUrl, outputFilePath, filtrarLinea) => {
    const fileStream = fs.createWriteStream(outputFilePath);
    fileStream.write("[\n"); // Inicia el JSON

    let firstItem = true;

    https
        .get(fileUrl, (response) => {
            if (response.statusCode !== 200) {
                return res.status(500).json({ error: "No se pudo descargar el archivo" });
            }

            // Descomprimir en streaming
            const gunzip = zlib.createGunzip();
            const rl = readline.createInterface({
                input: response.pipe(gunzip),
                crlfDelay: Infinity,
            });

            rl.on("line", (line) => {
                try {
                    if (line == "[") {
                        // No hacemos nada
                    } else if (line == "]" || line == "\n]") {
                        fileStream.write("\n]"); // Cierra el JSON
                        fileStream.end();
                        res.json({ message: "Archivo procesado y guardado como " + outputFilePath });
                    } else {
                        let linea = filtrarLinea(line);
                        if (linea != null) {
                            if (!firstItem) fileStream.write(",\n"); // Añade coma excepto en el primer ítem
                            fileStream.write(JSON.stringify(linea));
                            firstItem = false;
                        }
                    }
                } catch (err) {
                    console.error("Error procesando línea:", err.message);
                }
            });
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Error en la descarga", details: err.message });
        });
};
