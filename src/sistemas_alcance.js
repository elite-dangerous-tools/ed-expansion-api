async function solicitarFiltro(sistema, distancia, tipo="systems") {
    const parametros = {
        filters: { distance: { min: 0, max: distancia } },
        // sort: [],
        size: 500,
        page: 0,
        reference_system: sistema
    };

    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/save", {
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

async function recuperarFiltro(busqueda, tipo="systems") {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/recall/" + busqueda, {
        method: "GET",
        mode: "no-cors"
    });

    let respuesta = await response.json();

    if (respuesta.count > 500) {
        // Hay que recuperar las siguientes páginas
    }

    return respuesta.results;
}

exports.sistemas_alcance = async (req, res) => {
    try {
        const { distancia, sistema } = req.query;

        if (distancia > 100) {
            // No permitimos tanta distancia
            res.json([]);
            return;
        }
        
        // tipo: recuperamos systems, pero falta bodies (para controlar anillos y cinturones)
        let busqueda = await solicitarFiltro(sistema, distancia);
        let resultado = await recuperarFiltro(busqueda);

        resultado.forEach(fila => {
            delete fila.synthesis_recipes;
            delete fila.power_conflicts;
            delete fila.stations;
            delete fila.minor_faction_presences;
        });

        res.json(resultado);
    } catch (error) {
        console.log(error);
        res.json({ message: "Fallo crítico al buscar sistemas al alcance" });
    }
};
