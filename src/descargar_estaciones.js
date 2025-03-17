const path = require('path');

const { descargar } = require("./descargar");

const estacionesUrl = 'https://www.edsm.net/dump/stations.json.gz';
const estacionesJson = '../assets/stations.json';

function filtrarEstacion(linea) {
    if (linea[linea.length - 1] == ',') {
        linea = linea.substring(0, linea.length - 1);
    }
    
    let estacion = JSON.parse(linea);
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

    return estacion;
}

exports.descargar_estaciones = async (req, res) => {
    const filePath = path.join(__dirname, estacionesJson);

    await descargar(req, res, estacionesUrl, filePath, filtrarEstacion);
};
