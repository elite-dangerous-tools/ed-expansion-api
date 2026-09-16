const { recuperarBusqueda } = require("./spansh");

exports.estaciones = async (req, res) => {
    try {
        const { sistema, distancia, plataforma, planetaria } = req.query;

        // La distancia debe ser un número entre 0 y 75 (la web de React tampoco
        // deja más de 75). Excluye no numéricos, negativos y NaN
        const distanciaNumero = Number(distancia);
        if (!Number.isFinite(distanciaNumero) || distanciaNumero < 0 || distanciaNumero > 75) {
            res.status(400).json({ message: "La distancia debe ser un número entre 0 y 75" });
            return;
        }

        const parametros = {
            filters: {
                distance: { min: 0, max: distanciaNumero },
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

        // Adelgazamos y filtramos cada página nada más recibirla, antes de
        // pedir la siguiente (antes se acumulaban las 5 páginas enteras en RAM
        // y el filtrado se hacía al final sobre todo el montón)
        const procesarPagina = (resultados) => {
            let listaPagina = [];
            resultados.forEach(estacion => {
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

                listaPagina.push(estacion);
            });
            return listaPagina;
        };

        let listaEstaciones = await recuperarBusqueda(parametros, "stations", procesarPagina);

        if (!listaEstaciones) {
            // spansh no ha respondido (timeout o error HTTP)
            return res.status(502).json({ message: "spansh no ha respondido, prueba de nuevo en unos segundos" });
        }

        res.json(listaEstaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Fallo crítico al buscar estaciones con el producto" });
    }
};
