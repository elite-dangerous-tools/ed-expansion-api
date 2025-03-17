const path = require('path');

const { descargar } = require("./descargar");

const sistemasUrl = 'https://www.edsm.net/dump/systemsWithCoordinates.json.gz';
const sistemasJson = '../assets/systems.json';
const limite = 1000;

function filtrarSistema(linea) {
    if (linea[linea.length - 1] == ',') {
        linea = linea.substring(0, linea.length - 1);
    }
    
    let sistema = JSON.parse(linea);
    if (sistema.coords.x > limite) {
        return null;
    }
    if (sistema.coords.y > limite) {
        return null;
    }
    if (sistema.coords.z > limite) {
        return null;
    }

    delete sistema.id;
    delete sistema.id64;
    delete sistema.date;

    sistema.c = sistema.coords;
    delete sistema.coords;

    sistema.n = sistema.name;
    delete sistema.name;

    return sistema;
}

exports.descargar_sistemas = async (req, res) => {
    const filePath = path.join(__dirname, sistemasJson);

    await descargar(req, res, sistemasUrl, filePath, filtrarSistema);
};
