async function solicitarFiltro(parametros, tipo) {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/save", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        },
        method: "POST",
        body: JSON.stringify(parametros)
    });

    let respuesta = await response.json();

    return respuesta.search_reference;
}

async function recuperarFiltro(busqueda, tipo) {
    let response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/recall/" + busqueda, {
        method: "GET"
    });

    let respuesta = await response.json();

    return respuesta.results;
}

// Si spansh no responde en 30s, mejor fallar rápido (el handler devuelve el
// error) que dejar la petición colgada consumiendo memoria del contenedor.
// 30s y no 15s: spansh tarda ~10s en servir una página grande.
const TIMEOUT_PETICION_MS = 30000;

// Páginas de 200 en vez de 500: una página de 500 estaciones con markets pesa
// ~19MB de JSON que al parsearse a objetos ocupa 3-5x en el heap (~60-100MB
// transitorios). Con el heap limitado del contenedor, eso solo ya roza el OOM.
// Con 200 el pico por página baja a ~8MB de JSON (~25-40MB en heap).
// maximoPaginas 12 => tope de 2400 estaciones crudas. Como pedimos ordenadas
// por distancia ascendente, si hay más nos quedamos con las cercanas. 11
// páginas cubren HIP 10781 a 75 ly (2082 estaciones), el peor caso real medido.
// La memoria no se dispara porque el adelgazado (estaciones.js) limpia cada
// página antes de pedir la siguiente: lo acumulado pesa ~3MB de JSON por
// página-200, ~35MB de JSON en total para 12 páginas, holgado en 128MB de heap.
const paginacion = 200;
const maximoPaginas = 12;

// NOTA: spansh NO admite pedirle que omita campos (probado fields y
// market_fields: los guarda en la referencia de búsqueda pero sigue
// devolviendo todos los campos en results). Por eso el adelgazado es
// cliente-side, página a página.

async function llamadaBusqueda(parametros, tipo) {
    let response;

    try {
        response = await fetch("https://spansh.co.uk/api/" + tipo + "/search/", {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            method: "POST",
            body: JSON.stringify(parametros),
            signal: AbortSignal.timeout(TIMEOUT_PETICION_MS)
        });
    } catch (error) {
        // AbortSignal.timeout lanza TimeoutError; otros fallos de red también caen aquí
        console.error("Fallo de red llamando a spansh (" + tipo + "):", error.message);
        return null;
    }

    if (response.status !== 200) {
        // Solo logueamos lo útil, no el objeto Response entero
        console.error("spansh respondió HTTP " + response.status + " en " + tipo);
        return null;
    }

    return await response.json();
}

// parametros: filtros de búsqueda. tipo: "stations"|"systems"|...
// procesarPagina (opcional): función que recibe los resultados crudos de una
// página y devuelve los ya adelgazados/filtrados. Si se pasa, se aplica NADA
// MÁS recibir la página y ANTES de pedir la siguiente: así el pico de RAM es
// "una página cruda" en vez de "todas las páginas crudas", y lo acumulado
// es solo lo que nos interesa.
async function recuperarBusqueda(parametros, tipo, procesarPagina) {
    let repetir = true;
    parametros.page = 0;
    parametros.size = paginacion;

    let respuestas = [];
    while (repetir) {
        let peticion = await llamadaBusqueda(parametros, tipo);

        // Antes un fallo de spansh petaba en peticion.count.
        // Si falla cualquier página, devolvemos null y el handler responde error
        if (!peticion || !Array.isArray(peticion.results)) {
            return null;
        }

        let pagina = peticion.results;
        if (typeof procesarPagina === "function") {
            pagina = procesarPagina(pagina);
        }

        // Tope de páginas: paramos aunque queden más resultados. Como pedimos
        // ordenado por distancia ascendente, nos quedamos con las más cercanas.
        // Evita acumular miles de estaciones (una búsqueda de 75 ly devuelve
        // 2000+) hasta reventar el heap.
        if (peticion.results.length == paginacion && parametros.page + 1 < maximoPaginas) {
            repetir = true;
            parametros.page++;
        } else {
            if (peticion.count > respuestas.length + pagina.length) {
                console.warn("spansh (" + tipo + "): truncado a " + (respuestas.length + pagina.length) + " de " + peticion.count + " resultados");
            }
            repetir = false;
        }

        // push en bucle en vez de concat: concat crea un array nuevo copiando
        // todo lo acumulado (pico transitorio del doble), push reutiliza el mismo
        for (let i = 0; i < pagina.length; i++) {
            respuestas.push(pagina[i]);
        }

        // Liberamos la página cruda cuanto antes para que el GC la reclame
        // antes de pedir la siguiente (el JSON de una página pesa varios MB)
        peticion.results = null;
        peticion = null;
        pagina = null;
    }

    return respuestas;
}

module.exports = {
    solicitarFiltro: solicitarFiltro,
    recuperarFiltro: recuperarFiltro,
    recuperarBusqueda: recuperarBusqueda
};
