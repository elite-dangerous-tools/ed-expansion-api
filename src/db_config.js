
require('dotenv').config();

exports.db_config = {
    user:     process.env.DB_USER     || "apps",
    host:     process.env.DB_HOST     || "mariadb",
    database: process.env.DB_DATABASE || "elite",
    password: process.env.DB_PASSWORD || "BOamXj23OmmhDPtOBq1OiWH0e8QFpg",
    port:     process.env.DB_PORT     || 3306
};
