#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var CHECKSFILE_DEFAULT = "checks.json";
var HTMLFILE_DEFAULT = "index.html";



var assertURL = function(url) {
    url = url.toString();
    if(url.indexOf("http://") === -1 && url.indexOf("https://") === -1) {
        console.log("%s is not an URL. Exiting.", url);
        process.exit(1); 
    }
    return url;
}
var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(htmlfile) {
    return cheerio.load(fs.readFileSync(htmlfile));
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var checkHtml = function($, checksfile) {
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
}

var checkHtmlUrl = function(url, checksfile) {
    rest.get(url).on('complete', function(result, response) {
        if (result instanceof Error) {
            console.log("Could not get URL %s. Exiting.", url);
            process.exit(1);
        }
        $ = cheerio.load(result);
        var out =checkHtml($, checksfile);
        var outJson = JSON.stringify(out, null, 4);
        console.log(outJson);
    });
}
var checkHtmlFile = function(htmlfile, checksfile) {
    $ = cheerioHtmlFile(htmlfile);
    var out = checkHtml($, checksfile);
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

if(require.main == module) {
    program
        .option('-f, --file [html_file]', 'Path to index.html', clone(assertFileExists))
        .option('-u, --url [url]', 'URL to an HTML document', clone(assertURL))
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .parse(process.argv);
    if(program.url !== undefined && program.file !== undefined) { // one or the other, not both
        console.log("Specify either a file or an URL. Exiting");
        process.exit(1);
    }
    if(program.file === undefined && program.url === undefined) { // at least one
        console.log("Specify either a file or an URL. Exiting");
        process.exit(1);
    }
    if(program.url !== undefined) {
        checkHtmlUrl(program.url, program.checks);
    } else {
        var checkJson = checkHtmlFile(program.file, program.checks);
        var outJson = JSON.stringify(checkJson, null, 4);
        console.log(outJson);
    }
} else {
    exports.checkHtmlFile = checkHtmlFile;
    exports.checkHtmlUrl = checkHtmlUrl;
}
