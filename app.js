const express = require('express');
const app = express();
const bodyParser = require('body-parser')
const cors = require('cors')


app.use(cors())
app.options('*', cors())
app.use(bodyParser.json({limit:'5mb'}));
app.set('trust proxy', true);

const routes = require('./routes');
app.use('/', routes);

app.use(express.json());
app.listen(5000, () => console.log('Server started'));