const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
const path = require('path');

const estacionesZip = './assets/stations.json.gz';
const estacionesJson = './assets/stations.json';

const sistemasZip = './assets/systems.json.gz';
const sistemasJson = './assets/systems.json';

async function descargarFichero(fileUrl, filePath) {
    try {
        // Descargar el archivo comprimido
        const file = fs.createWriteStream(filePath);
        await new Promise((resolve, reject) => {
            https.get(fileUrl, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            }).on('error', (err) => {
                fs.unlink(filePath, () => {}); // Borrar el archivo en caso de error
                reject(err);
            });
        });

    } catch (error) {
        res.status(500).json({ error: 'Error al descargar el archivo', details: error.message });
    }
}

async function extraerFichero(filePath, outputFilePath) {
    try {
        
        // Descomprimir el archivo
        await new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(filePath);
            const writeStream = fs.createWriteStream(outputFilePath);
            const unzip = zlib.createGunzip();

            readStream.pipe(unzip).pipe(writeStream);

            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

    } catch (error) {
        res.status(500).json({ error: 'Error al descomprimir el archivo', details: error.message });
    }
}

exports.descargar_sistemas = async (req, res) => {
    const fileUrl = 'https://www.edsm.net/dump/systemsWithCoordinates.json.gz';
    const filePath = path.join(__dirname, sistemasZip);

    await descargarFichero(fileUrl, filePath);
    
    res.json({ message: 'Sistemas descargados' });
};

exports.extraer_sistemas = async (req, res) => {
    const filePath = path.join(__dirname, sistemasZip);
    const outputFilePath = path.join(__dirname, sistemasJson);
    
    await extraerFichero(filePath, outputFilePath);

    // Leer y enviar el contenido del archivo JSON descomprimido
    // const jsonData = fs.readFileSync(outputFilePath, 'utf8');
    
    // res.json(JSON.parse(jsonData));
    res.json({ message: 'Sistemas extraidos' });
};

exports.descargar_estaciones = async (req, res) => {
    const fileUrl = 'https://www.edsm.net/dump/stations.json.gz';
    const filePath = path.join(__dirname, estacionesZip);

    await descargarFichero(fileUrl, filePath);
    
    res.json({ message: 'Estaciones descargadas' });
};

exports.extraer_estaciones = async (req, res) => {
    const filePath = path.join(__dirname, estacionesZip);
    const outputFilePath = path.join(__dirname, estacionesJson);
    
    await extraerFichero(filePath, outputFilePath);

    // Leer y enviar el contenido del archivo JSON descomprimido
    // const jsonData = fs.readFileSync(outputFilePath, 'utf8');
    
    // res.json(JSON.parse(jsonData));
    res.json({ message: 'Estaciones extraidas' });
};
