async function solicitarFiltro(sistema, distancia, plataforma, planetaria) {
    const parametros = {
        filters: {
            distance: { min: 0, max: distancia },
            has_market: { value: true }
        },
        sort: [{ distance: { direction: "asc" } }],
        size: 500,
        page: 0,
        reference_system: sistema
    };

    if (plataforma == "G") {
        parametros.filters.has_large_pad = { value: true };
    } else if (plataforma == "M") {
        parametros.filters.has_large_pad = { value: false };
    }

    if (planetaria == "1") {
        parametros.filters.is_planetary = { value: true };
    } else if (planetaria == "0") {
        parametros.filters.is_planetary = { value: false };
    }

    let response = await fetch("https://spansh.co.uk/api/stations/search/save", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(parametros)
    });

    let respuesta = await response.json();

    return respuesta.search_reference;
}

async function recuperarFiltro(referencia) {
    let response = await fetch("https://spansh.co.uk/api/stations/search/recall/" + referencia, {
        method: "GET",
        mode: "no-cors"
    });

    let respuesta = await response.json();

    return respuesta.results;
}

async function recuperarBusqueda(sistema, distancia, plataforma, planetaria) {
    const parametros = {
        filters: {
            distance: { min: 0, max: distancia },
            has_market: { value: true }
        },
        sort: [{ distance: { direction: "asc" } }],
        size: 500,
        page: 0,
        reference_system: sistema
    };

    if (plataforma == "G") {
        parametros.filters.has_large_pad = { value: true };
    } else if (plataforma == "M") {
        parametros.filters.has_large_pad = { value: false };
    }

    if (planetaria == "1") {
        parametros.filters.is_planetary = { value: true };
    } else if (planetaria == "0") {
        parametros.filters.is_planetary = { value: false };
    }

    let response = await fetch("https://spansh.co.uk/api/stations/search/", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(parametros)
    });

    let respuesta = await response.json();

    return respuesta.results;
}

exports.estaciones = async (req, res) => {
    try {
        const { sistema, distancia, plataforma, planetaria } = req.query;

        if (distancia > 150) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }

        let respuesta = await recuperarBusqueda(sistema, distancia, plataforma, planetaria);

        let listaEstaciones = [];
        respuesta.forEach(estacion => {
            if (estacion.type && estacion.type.includes("Construction Depot")) {
                return;
            }
            if (estacion.name && estacion.name.includes("Colonisation Ship")) {
                return;
            }

            if (!estacion.market || estacion.market.length == 0) {
                return;
            }

            delete estacion.import_commodities;
            delete estacion.export_commodities;
            delete estacion.economies;
            delete estacion.services;
            delete estacion.ships;
            delete estacion.modules;

            listaEstaciones.push(estacion);
        });

        res.json(listaEstaciones);
    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar estaciones con el producto" });
    }
};
