/**
 * Created by johann on 29.06.17.
 */

const express = require('express');
const router = express.Router();
const request = require('request-json');
const _ = require('lodash');
const Promise = require('bluebird');
const handlebars = require('handlebars');


const databaseAdapter = new (require('./databaseAdapter'))();

let getStandardValues = async function(req, res, values) {
    let renderValues;
    console.log(values);
    if(!values) {
        values = {};
    }

    await databaseAdapter.getRepoInfos().then((repos) => {

        repos = _.filter(repos, (repo) => repo.webhookEndpoint)

        values.standardRepositories = repos;


        renderValues = values;
    });

    return renderValues;

};


router.get('/', async (req, res, next) => {


    res.render('index.hbs', await getStandardValues(req, res));

});

router.get('/:id', async(req, res, next) => {

    let repositoryId = req.params.id;
    databaseAdapter.getTemplate(repositoryId).then(async (templates) => {

        _.forEach(templates, (template) => {
            template.templateTextHTML = template.templateText.replace(new RegExp('\n', 'g'), '<br>');
        });


        let renderValues = await getStandardValues(req, res, {templates: templates});
        res.render('repoDetail.hbs', renderValues);

    });
});

router.get('/:id/:templateString', async (req, res, next) => {

    let repositoryId = req.params.id;
    let templateString = req.params.templateString;

    databaseAdapter.getTemplate(repositoryId, templateString).then(async (templates) => {

        res.render('repoDetailEdit.hbs', await getStandardValues(req, res, {template: templates[0]}));

    });

});

router.post('/githubEndpoint', (req, res, next) => {

    let eventPayload = req.body;
    let repositoryId = Number(eventPayload['repository']['id']);


    if (req.headers['x-github-event'] === 'ping') {
        // New Hook was added in GitHub.

        let repo = req.body['repository'];

        let id = repo['id'];
        let fullName = repo['full_name'];

        databaseAdapter.addRepo(id, fullName).then((result) => {
            res.status(200).send("Added.");
        }).catch((error) => {
            res.status(500).send("Repo is ready to use, this is not a new id.");
        });

        return;
    }


    let caseIdentifier = req.headers['x-github-event'] + "." + req.body['action'];


    databaseAdapter.addEvent(eventPayload).then((result) => {
        // Get webhook URL for repository.
        return [databaseAdapter.getRepoInfos(repositoryId), databaseAdapter.getTemplate(repositoryId, caseIdentifier)];
    }).spread((repoInfos, templates) => {

        if (repoInfos.length <= 0) {
            throw new Error('Unknown Repository');
        }
        if (templates.length <= 0) {
            throw new Error('Unknown Template');
        }

        let resultEntry = repoInfos[0];
        let webhookEndpoint = resultEntry['webhookEndpoint'];

        console.log(webhookEndpoint);
        let reqClient = request.createClient(webhookEndpoint);


        let source = templates[0].templateText;
        let template = handlebars.compile(source);
        let outputString = template(eventPayload);

        let postValues = {
            "content": outputString
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