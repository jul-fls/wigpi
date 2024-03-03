const mariadb = require('mariadb');
const pool = mariadb.createPool({
    host: '127.0.0.1',
    user: 'username', 
    password: 'password',
    connectionLimit: 100,
    database: 'wigpi',
    rowsAsArray: true
});
async function query(query) {
    let conn;
    try {
    	conn = await pool.getConnection();
    	const result = await conn.query(query);
        return result;

    } catch (err) {
    	throw err;
    } finally {
    	if (conn){
          conn.end();
      }
    }
}
module.exports = {
    query: query
}