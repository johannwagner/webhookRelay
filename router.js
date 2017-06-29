/**
 * Created by johann on 29.06.17.
 */

const express = require('express');
const router = express.Router();
const request = require('request-json');
const _ = require('lodash');

const databaseAdapter = new (require('./databaseAdapter'))();

router.get('/', (req, res, next) => {

    databaseAdapter.getTemplate().then((templates) => {

        _.forEach(templates, (template) => {
            template.templateTextHTML = template.templateText.replace(new RegExp('\n', 'g'), '<br>');
        });

        res.render('index.hbs', {templates: templates});

    });


});

router.post('/githubEndpoint', (req, res, next) => {

    let eventPayload = req.body;
    let repositoryId = Number(eventPayload['repository']['id']);

    let caseIdentifier = req.header['x-github-event'] + "." + req.body['action'];


    databaseAdapter.addEvent(eventPayload).then((result) => {
        // Get webhook URL for repository.
        return [databaseAdapter.getRepoInfos(repositoryId), databaseAdapter.getTemplate(repositoryId, caseIdentifier)];
    }).spread((reopInfos, templates) => {
        if (reopInfos.length <= 0) {
            throw new Error('Unknown Repository');
        }

        let resultEntry = reopInfos[0];
        let webhookEndpoint = resultEntry['webhookEndpoint'];

        console.log(webhookEndpoint);
        let reqClient = request.createClient(webhookEndpoint);


        let postValues = {
            "content": "**Does formatting work?** :red_circle: "
        };


        return reqClient.post('', postValues);
    }).then((result) => {
        res.status(200).send("Sent!");
    }).catch((error) => {
        console.error(error);
        res.status(500).send(error.stack);
    });


});

module.exports = router;