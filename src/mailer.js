'use strict';

const nodemailer = require('nodemailer');
const cfg = require('./config/config');
const secrets = require('./config/config.secrets');

const config = Object.assign({}, cfg, secrets);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.from,
    pass: config.email.password
  }
});

module.exports = transporter;
