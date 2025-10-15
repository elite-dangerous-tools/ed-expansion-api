
wget https://inara.cz/elite/commodities-list/?setlanguage=1 -O ../assets/prod_en.html
wget https://inara.cz/elite/commodities-list/?setlanguage=4 -O ../assets/prod_es.html

node traducir_productos.js
