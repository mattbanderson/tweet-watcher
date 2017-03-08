'use strict';

const fs = require('fs');
const request = require('request');
const util = require('util');
const cheerio = require('cheerio');
const translate = require('google-translate-api');
const low = require('lowdb');
const Encoder = require('node-html-encoder').Encoder;
const dateFormat = require('dateformat');
const mailer = require('./mailer');
const cfg = require('./config/config');
const secrets = require('./config/config.secrets');

const config = Object.assign({}, cfg, secrets);
const db = low('db.json', { storage: require('lowdb/lib/storages/file-async') });
const encoder = new Encoder('entity');
db.defaults({ tweets: []}).write();

function sendEmail(emailText) {
  const opts = {
    from: config.email.from,
    to: config.email.to,
    subject: config.email.subject,
    html: emailText
  };

  mailer.sendMail(opts, (error) => {
    if (error) {
      return console.log(error);
    } else {
      console.log('Message sent to %s',config.email.to);
    }
  });
}

function checkTweets() {
  request(config.searchUrl, function(error, response, html) {
    console.log('Checking for new tweets...');
    if (!error){
      const $ = cheerio.load(html);

      $('.js-stream-tweet').filter(function() {
          const data = $(this);
          const tweet = {
            id: data.attr('data-item-id'),
            url: 'https://twitter.com' + data.attr('data-permalink-path'),
            text: data.find(".tweet-text").text()
          };

          const exists = db.get('tweets').find({ id: tweet.id }).value();
          if (!exists) {
            console.log('New tweet(s) found!');
            translate(tweet.text, {from: config.sourceLanguage, to: config.targetLanguage}).then(res => {
              console.log(dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT"));
              console.log(tweet.text);
              console.log(res.text);
              db.get('tweets').push({id: tweet.id, url: tweet.url, text: tweet.text, ru: res.text}).write();
              sendEmail(util.format('%s <a href="%s" target="_blank">%s</a>', encoder.htmlEncode(res.text), tweet.url, tweet.url));
            }).catch(err => {
              console.error(err);
            });
          }
      })
    }
  })
}

setInterval(checkTweets, config.refreshInterval);
