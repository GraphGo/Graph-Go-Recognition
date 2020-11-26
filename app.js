const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const cors = require('cors')
const cv = require('opencv.js')


app.use(cors())
app.options('*', cors())
app.use(bodyParser.json({parameterLimit:500000,limit:'50mb', extended:true}));
app.set('trust proxy', true);

const routes = require('./routes');
app.use('/', routes);

app.use(express.json());
app.listen(5000, () => console.log('Server started'));