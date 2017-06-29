/**
 * Created by Johann on 08/06/2017.
 */

const mysql = require('promise-mysql');
const _ = require('lodash');
const Secrets = require('./secrets.js');

const WhereConnector = {
    "AND": 1,
    "OR": 2
};

class WhereGenerator {
    constructor(dbPool, whereConnector) {
        this.dbPool = dbPool;
        this.firstItem = true;
        this.whereString = "";
        this.whereConnector = whereConnector;
    }

    insertClause(insertKey, insertValue) {

        if (!insertValue) {
            return;
        }

        if (!this.firstItem) {
            this.whereString += " " + _.findKey(WhereConnector, (value) => value === this.whereConnector) + " ";
        } else {
            this.firstItem = false;
            this.whereString += " WHERE ";
        }

        this.whereString += this.dbPool.escapeId(insertKey) + " = " + this.dbPool.escape(insertValue);
    }

    toString() {
        return this.whereString;
    }
}


class DatabaseAdapter {


    constructor() {
        this.pool = mysql.createPool(Secrets.PoolConfiguration);
    }

    addEvent(eventPayload) {
        return this.pool.query('INSERT INTO events (payload) VALUES (?)', [JSON.stringify(eventPayload)]);
    }

    getRepoInfos(repositoryId) {
        let whereGenerator = new WhereGenerator(this.pool, WhereConnector.AND);
        whereGenerator.insertClause('repositoryId', repositoryId);

        return this.pool.query('SELECT * FROM repos ' + whereGenerator.toString());
    }

    getTemplate(repositoryId, caseIdentifier) {

        let whereGenerator = new WhereGenerator(this.pool, WhereConnector.AND);
        whereGenerator.insertClause('repositoryId', repositoryId);
        whereGenerator.insertClause('templateString', caseIdentifier);

        return this.pool.query('SELECT * FROM templates ' + whereGenerator.toString());
    }

    addRepo(id, fullName) {
        return this.pool.query('INSERT INTO repos (repositoryId, repositoryName) VALUES (?,?)', [id, fullName]);
    }
}

module.exports = DatabaseAdapter;


