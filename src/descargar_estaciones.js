const path = require('path');

const { descargar } = require("./descargar");

const sistemasUrl = 'https://www.edsm.net/dump/stations.json.gz';
const sistemasJson = '../assets/systems.json';

function filtrarSistema(linea) {
    if (linea[linea.length - 1] == ',') {
        linea = linea.substring(0, linea.length - 1);
    }
    
    let sistema = JSON.parse(linea);
    if (sistema.haveMarket == false) {
        return null;
    }

    delete sistema.otherServices;
    delete sistema.controllingFaction;
    delete sistema.updateTime;
    delete sistema.outfitting;

    return sistema;
}

exports.descargar_sistemas = async (req, res) => {
    const filePath = path.join(__dirname, sistemasJson);

    await descargar(req, res, sistemasUrl, filePath, filtrarSistema);
};
