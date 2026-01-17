const express = require('express');
const app = express();

app.use(express.static('public'));

app.set('view engine', 'pug');
app.set('views', './views');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const indexRouter = require('./routes/index');
app.use('/', indexRouter);

module.exports = app;