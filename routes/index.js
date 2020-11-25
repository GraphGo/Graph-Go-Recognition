const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    if (!req.body) {
        return res.status(400).send({
            message: "No data is passed in!"
        });
    }
    // call recognition function
    res.send({result: [1, 5, 2, 3, 4]});
});

module.exports = router;