
async function solicitarFiltro(parametros, tipo) {

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

async function recuperarFiltro(busqueda, tipo) {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/recall/" + busqueda, {
        method: "GET",
        mode: "no-cors"
    });

    let respuesta = await response.json();

    return respuesta.results;
}

async function recuperarBusqueda(parametros, tipo) {
    
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/", {
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

module.exports = {
    solicitarFiltro: solicitarFiltro,
    recuperarFiltro: recuperarFiltro,
    recuperarBusqueda: recuperarBusqueda,
};
